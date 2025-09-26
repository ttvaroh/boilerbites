import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "./supabase";
import { getTodayDateString } from "./timezone-utils";

interface MenuItem {
  id: string;
  name: string;
  vegetarian?: boolean;
  vegan?: boolean;
  gluten?: boolean;
  allergens?: string[];
  serving_size?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  protein_per_100cals?: number;
  ingredients?: string;
  last_verified?: string;
}

interface Station {
  id: string;
  name: string;
  items: MenuItem[];
}

interface Meal {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  open: boolean;
  stations: Station[];
}

interface DiningHallMenu {
  locationName: string;
  menuId: string;
  isPublished: boolean;
  meals: Meal[];
}

interface Location {
  name: string;
  hasMenu: boolean;
  menuId?: string;
  isPublished?: boolean;
}

interface MenuDataContextType {
  locations: Location[];
  menuData: Map<string, DiningHallMenu>;
  loading: boolean;
  error: string | null;
  refreshLocations: () => Promise<void>;
  getMenuForLocation: (locationName: string) => Promise<DiningHallMenu | null>;
  isLocationLoading: (locationName: string) => boolean;
  isMenuReady: (locationName: string) => boolean;
}

const MenuDataContext = createContext<MenuDataContextType | undefined>(
  undefined
);

interface MenuDataProviderProps {
  children: ReactNode;
}

export function MenuDataProvider({ children }: MenuDataProviderProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [menuData, setMenuData] = useState<Map<string, DiningHallMenu>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingLocations, setLoadingLocations] = useState<Set<string>>(new Set());

  // Fetch only locations and basic menu info on startup
  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's date in EST
      const today = getTodayDateString();

      // Fetch all locations
      const { data: locationsData, error: locationsError } = await supabase
        .from("location")
        .select("name");

      if (locationsError) {
        throw new Error(`Failed to fetch locations: ${locationsError.message}`);
      }

      const locationsList: Location[] = [];

      // Check which locations have menus for today
      for (const location of locationsData || []) {
        try {
          const { data: menu, error: menuError } = await supabase
            .from("day_menu")
            .select("id, is_published")
            .eq("location_name", location.name)
            .eq("serve_date", today)
            .maybeSingle();

          if (menuError || !menu) {
            locationsList.push({
              name: location.name,
              hasMenu: false,
            });
          } else {
            locationsList.push({
              name: location.name,
              hasMenu: true,
              menuId: menu.id,
              isPublished: menu.is_published,
            });
          }
        } catch (locationError) {
          console.warn(`Error checking menu for ${location.name}:`, locationError);
          locationsList.push({
            name: location.name,
            hasMenu: false,
          });
        }
      }

      setLocations(locationsList);
      console.log(`✅ Loaded ${locationsList.length} locations`);
    } catch (error) {
      console.error("Error fetching locations:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed menu data for a specific location
  const fetchMenuForLocation = async (locationName: string): Promise<DiningHallMenu | null> => {
    // Check if already loaded
    if (menuData.has(locationName)) {
      return menuData.get(locationName) || null;
    }

    // Check if currently loading
    if (loadingLocations.has(locationName)) {
      // Wait for the current request to complete
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (menuData.has(locationName)) {
            resolve(menuData.get(locationName) || null);
          } else if (!loadingLocations.has(locationName)) {
            resolve(null);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    try {
      setLoadingLocations(prev => new Set(prev).add(locationName));

      const today = getTodayDateString();
      const location = locations.find(loc => loc.name === locationName);
      
      if (!location || !location.hasMenu || !location.menuId) {
        return null;
      }

      // Fetch meals for this menu
      const { data: mealsData, error: mealsError } = await supabase
        .from("day_meal")
        .select(
          `
          id,
          meal_name,
          meal_order,
          start_time,
          end_time,
          open
        `
        )
        .eq("day_menu_id", location.menuId)
        .order("meal_order");

      if (mealsError) {
        console.error(`Error fetching meals for ${locationName}:`, mealsError);
        return null;
      }

      // Fetch stations and items for each meal
      const mealsWithStations: Meal[] = [];

      for (const meal of mealsData || []) {
        // Fetch stations for this meal
        const { data: stationsData, error: stationsError } = await supabase
          .from("day_station")
          .select(
            `
            id,
            name,
            display_order
          `
          )
          .eq("day_meal_id", meal.id)
          .order("display_order");

        if (stationsError) {
          console.error(
            `Error fetching stations for meal ${meal.meal_name} in ${locationName}:`,
            stationsError
          );
          continue;
        }

        // Fetch items for each station
        const stationsWithItems: Station[] = [];

        for (const station of stationsData || []) {
          const { data: itemsData, error: itemsError } = await supabase
            .from("day_station_item")
            .select(
              `
              item_id,
              item:item_id (
                id,
                name,
                vegetarian,
                vegan,
                gluten,
                allergens,
                serving_size,
                calories,
                protein_g,
                carbs_g,
                fat_g,
                fiber_g,
                sugar_g,
                sodium_mg,
                protein_per_100cals,
                last_verified
              )
            `
            )
            .eq("day_station_id", station.id);

          if (itemsError) {
            console.error(
              `Error fetching items for station ${station.name} in ${locationName}:`,
              itemsError
            );
            continue;
          }

          const items: MenuItem[] = (itemsData || []).map((item: any) => ({
            id: item.item.id,
            name: item.item.name,
            vegetarian: item.item.vegetarian,
            vegan: item.item.vegan,
            gluten: item.item.gluten,
            allergens: item.item.allergens || [],
            serving_size: item.item.serving_size,
            calories: item.item.calories,
            protein_g: item.item.protein_g,
            carbs_g: item.item.carbs_g,
            fat_g: item.item.fat_g,
            fiber_g: item.item.fiber_g,
            sugar_g: item.item.sugar_g,
            sodium_mg: item.item.sodium_mg,
            protein_per_100cals: item.item.protein_per_100cals,
            last_verified: item.item.last_verified,
          }));

          stationsWithItems.push({
            id: station.id,
            name: station.name,
            items,
          });
        }

        mealsWithStations.push({
          id: meal.id,
          name: meal.meal_name,
          start_time: meal.start_time || "",
          end_time: meal.end_time || "",
          open: meal.open,
          stations: stationsWithItems,
        });
      }

      const menu: DiningHallMenu = {
        locationName,
        menuId: location.menuId,
        isPublished: location.isPublished || false,
        meals: mealsWithStations,
      };

      // Cache the menu data
      setMenuData(prev => new Map(prev).set(locationName, menu));
      console.log(`✅ Loaded menu data for ${locationName}`);

      return menu;
    } catch (error) {
      console.error(`Error fetching menu for ${locationName}:`, error);
      return null;
    } finally {
      setLoadingLocations(prev => {
        const newSet = new Set(prev);
        newSet.delete(locationName);
        return newSet;
      });
    }
  };

  const getMenuForLocation = async (locationName: string): Promise<DiningHallMenu | null> => {
    // If menu is already cached, return it immediately
    if (menuData.has(locationName)) {
      return menuData.get(locationName) || null;
    }
    
    // If currently loading, wait for it to complete
    if (loadingLocations.has(locationName)) {
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (menuData.has(locationName)) {
            resolve(menuData.get(locationName) || null);
          } else if (!loadingLocations.has(locationName)) {
            resolve(null);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }
    
    // Otherwise, fetch it
    return await fetchMenuForLocation(locationName);
  };

  const isLocationLoading = (locationName: string): boolean => {
    return loadingLocations.has(locationName);
  };

  const isMenuReady = (locationName: string): boolean => {
    return menuData.has(locationName);
  };

  const refreshLocations = async () => {
    await fetchLocations();
  };

  // Load locations on mount, then start background loading of all menus
  useEffect(() => {
    const initializeData = async () => {
      await fetchLocations();
      // Start background loading of all menus after locations are loaded
      startBackgroundMenuLoading();
    };
    
    initializeData();
  }, []);

  // Start loading all menus in the background
  const startBackgroundMenuLoading = async () => {
    // Load menus one by one to avoid overwhelming the database
    for (const location of locations) {
      if (location.hasMenu && !menuData.has(location.name) && !loadingLocations.has(location.name)) {
        // Don't await - let them load in parallel
        fetchMenuForLocation(location.name).catch(error => {
          console.warn(`Background loading failed for ${location.name}:`, error);
        });
        
        // Small delay between requests to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  // Start background loading when locations change
  useEffect(() => {
    if (locations.length > 0) {
      startBackgroundMenuLoading();
    }
  }, [locations]);

  const value: MenuDataContextType = {
    locations,
    menuData,
    loading,
    error,
    refreshLocations,
    getMenuForLocation,
    isLocationLoading,
    isMenuReady,
  };

  return (
    <MenuDataContext.Provider value={value}>
      {children}
    </MenuDataContext.Provider>
  );
}

export function useMenuData() {
  const context = useContext(MenuDataContext);
  if (context === undefined) {
    throw new Error("useMenuData must be used within a MenuDataProvider");
  }
  return context;
}
