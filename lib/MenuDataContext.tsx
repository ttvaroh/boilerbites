import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState
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

interface MealsByDate {
  breakfast?: Meal;
  lunch?: Meal;
  lateLunch?: Meal;  // Only for Windsor
  dinner?: Meal;
}

interface MenuDataByDate {
  locationName: string;
  menusByDate: Map<string, MealsByDate>;  // key: YYYY-MM-DD
}

interface DiningHallMenu {
  locationName: string;
  menuId: string;
  isPublished: boolean;
  meals: Meal[];
}

interface LocationInfo {
  name: string;
  hasMenu: boolean;
  menuId?: string;
  isPublished?: boolean;
  meals?: Meal[];
}

interface MenuDataContextType {
  currentLocation: string | null;
  menuData: MenuDataByDate | null;
  locations: LocationInfo[];
  loading: boolean;
  error: string | null;
  switchLocation: (locationName: string) => Promise<void>;
  getMenuForDate: (locationName: string, date: string) => Promise<MealsByDate | null>;
  getAvailableLocations: () => Promise<string[]>;
  refreshLocations: () => Promise<void>;
  isDateLoading: (date: string) => boolean;
  isDateReady: (date: string) => boolean;
}

const MenuDataContext = createContext<MenuDataContextType | undefined>(
  undefined
);

interface MenuDataProviderProps {
  children: ReactNode;
}

export function MenuDataProvider({ children }: MenuDataProviderProps) {
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<MenuDataByDate | null>(null);
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());

  // Switch to a new location and clear existing data
  const switchLocation = async (locationName: string): Promise<void> => {
    if (currentLocation === locationName && menuData) {
      return; // Already on this location
    }
    
    // Clear existing data and switch
    setCurrentLocation(locationName);
    setMenuData({
      locationName,
      menusByDate: new Map(),
    });
    setError(null);
  };

  // Helper function to fetch stations and items for a meal
  const fetchMealWithStations = async (meal: any): Promise<Meal> => {
    const { data: stationsData } = await supabase
      .from("day_station")
      .select(`
        id,
        name,
        display_order
      `)
      .eq("day_meal_id", meal.id)
      .order("display_order");
    
    const stationsWithItems: Station[] = [];
    
    for (const station of stationsData || []) {
      const { data: itemsData } = await supabase
        .from("day_station_item")
        .select(`
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
        `)
        .eq("day_station_id", station.id);
      
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
    
    return {
      id: meal.id,
      name: meal.meal_name,
      start_time: meal.start_time || "",
      end_time: meal.end_time || "",
      open: meal.open,
      stations: stationsWithItems,
    };
  };

  // Get menu data for a specific location and date
  const getMenuForDate = async (locationName: string, date: string): Promise<MealsByDate | null> => {
    // Switch location if needed
    if (currentLocation !== locationName) {
      await switchLocation(locationName);
    }
    
    // Check if date already loaded
    if (menuData?.menusByDate.has(date)) {
      return menuData.menusByDate.get(date) || null;
    }
    
    // Check if currently loading
    if (loadingDates.has(date)) {
      // Wait for loading to complete
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (menuData?.menusByDate.has(date)) {
            resolve(menuData.menusByDate.get(date) || null);
          } else if (!loadingDates.has(date)) {
            resolve(null);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }
    
    try {
      setLoadingDates(prev => new Set(prev).add(date));
      
      // Fetch menu for this date
      const { data: menu, error: menuError } = await supabase
        .from("day_menu")
        .select("id, is_published")
        .eq("location_name", locationName)
        .eq("serve_date", date)
        .maybeSingle();
      
      if (menuError || !menu) {
        return null;
      }
      
      // Fetch meals
      const { data: mealsData, error: mealsError } = await supabase
        .from("day_meal")
        .select(`
          id,
          meal_name,
          meal_order,
          start_time,
          end_time,
          open
        `)
        .eq("day_menu_id", menu.id)
        .order("meal_order");
      
      if (mealsError || !mealsData) {
        return null;
      }
      
      // Fetch stations and items for each meal
      const mealsByDate: MealsByDate = {};
      
      for (const meal of mealsData) {
        const mealWithStations = await fetchMealWithStations(meal);
        
        // Map meal to the correct key
        const mealName = meal.meal_name.toLowerCase();
        if (mealName.includes('breakfast')) {
          mealsByDate.breakfast = mealWithStations;
        } else if (mealName.includes('late lunch')) {
          if (locationName === 'Windsor') {
            mealsByDate.lateLunch = mealWithStations;
          }
        } else if (mealName.includes('lunch')) {
          mealsByDate.lunch = mealWithStations;
        } else if (mealName.includes('dinner')) {
          mealsByDate.dinner = mealWithStations;
        }
      }
      
      // Update menuData with this date
      setMenuData(prev => {
        if (!prev || prev.locationName !== locationName) {
          return {
            locationName,
            menusByDate: new Map([[date, mealsByDate]]),
          };
        }
        const newMap = new Map(prev.menusByDate);
        newMap.set(date, mealsByDate);
        return {
          ...prev,
          menusByDate: newMap,
        };
      });
      
      return mealsByDate;
    } catch (error) {
      console.error(`Error fetching menu for ${locationName} on ${date}:`, error);
      return null;
    } finally {
      setLoadingDates(prev => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
  };

  // Utility functions for checking loading and ready states
  const isDateLoading = (date: string): boolean => {
    return loadingDates.has(date);
  };

  const isDateReady = (date: string): boolean => {
    return menuData?.menusByDate.has(date) || false;
  };

  // Load locations on mount
  useEffect(() => {
    refreshLocations();
  }, []);

  // Fetch locations with basic menu info for today
  const refreshLocations = async (): Promise<void> => {
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

      const locationsList: LocationInfo[] = [];

      // Check which locations have menus for today and get basic meal info
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
            // Get basic meal info for this location
            const { data: mealsData, error: mealsError } = await supabase
              .from("day_meal")
              .select(`
                id,
                meal_name,
                meal_order,
                start_time,
                end_time,
                open
              `)
              .eq("day_menu_id", menu.id)
              .order("meal_order");

            if (mealsError || !mealsData) {
              locationsList.push({
                name: location.name,
                hasMenu: true,
                menuId: menu.id,
                isPublished: menu.is_published,
              });
            } else {
              const meals: Meal[] = mealsData.map(meal => ({
                id: meal.id,
                name: meal.meal_name,
                start_time: meal.start_time || "",
                end_time: meal.end_time || "",
                open: meal.open,
                stations: [], // Empty for basic info
              }));

              locationsList.push({
                name: location.name,
                hasMenu: true,
                menuId: menu.id,
                isPublished: menu.is_published,
                meals: meals,
              });
            }
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

  // Get available locations from the database
  const getAvailableLocations = async (): Promise<string[]> => {
    try {
      // If already loaded, return cached locations
      if (locations.length > 0) {
        return locations.map(loc => loc.name);
      }

      // If not loaded, fetch them
      await refreshLocations();
      return locations.map(loc => loc.name);
    } catch (error) {
      console.error("Error fetching locations:", error);
      return [];
    }
  };





  const value: MenuDataContextType = {
    currentLocation,
    menuData,
    locations,
    loading,
    error,
    switchLocation,
    getMenuForDate,
    getAvailableLocations,
    refreshLocations,
    isDateLoading,
    isDateReady,
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
