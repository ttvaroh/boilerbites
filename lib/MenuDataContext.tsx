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
  getMealBasicInfo: (locationName: string, date: string) => Promise<MealsByDate | null>;
  getMealDetailedData: (locationName: string, date: string, mealType: string) => Promise<Meal | null>;
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


  // Get basic meal info only (for fast loading)
  const getMealBasicInfo = async (locationName: string, date: string): Promise<MealsByDate | null> => {
    try {
      const { data: menuData, error: menuError } = await supabase
        .from("day_menu")
        .select(`
          id,
          is_published,
          day_meal (
            id,
            meal_name,
            meal_order,
            start_time,
            end_time,
            open
          )
        `)
        .eq("location_name", locationName)
        .eq("serve_date", date)
        .maybeSingle();
      
      if (menuError || !menuData) {
        return null;
      }
      
      const mealsByDate: MealsByDate = {};
      
      if (menuData.day_meal && menuData.day_meal.length > 0) {
        for (const meal of menuData.day_meal) {
          const mealBasic: Meal = {
            id: meal.id,
            name: meal.meal_name,
            start_time: meal.start_time || "",
            end_time: meal.end_time || "",
            open: meal.open,
            stations: [], // Empty stations for basic info
          };
          
          const mealName = meal.meal_name.toLowerCase();
          if (mealName.includes('breakfast')) {
            mealsByDate.breakfast = mealBasic;
          } else if (mealName.includes('late lunch')) {
            if (locationName === 'Windsor') {
              mealsByDate.lateLunch = mealBasic;
            }
          } else if (mealName.includes('lunch')) {
            mealsByDate.lunch = mealBasic;
          } else if (mealName.includes('dinner')) {
            mealsByDate.dinner = mealBasic;
          }
        }
      }
      
      return mealsByDate;
    } catch (error) {
      console.error(`Error fetching basic meal info for ${locationName} on ${date}:`, error);
      return null;
    }
  };

  // Get detailed data for a specific meal only
  const getMealDetailedData = async (locationName: string, date: string, mealType: string): Promise<Meal | null> => {
    try {
      const { data: menuData, error: menuError } = await supabase
        .from("day_menu")
        .select(`
          id,
          day_meal!inner (
            id,
            meal_name,
            meal_order,
            start_time,
            end_time,
            open,
            day_station (
              id,
              name,
              display_order,
              day_station_item (
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
              )
            )
          )
        `)
        .eq("location_name", locationName)
        .eq("serve_date", date)
        .maybeSingle();
      
      if (menuError || !menuData) {
        return null;
      }
      
      // Find the specific meal
      const targetMeal = menuData.day_meal.find((meal: any) => {
        const mealName = meal.meal_name.toLowerCase();
        if (mealType === 'breakfast') return mealName.includes('breakfast');
        if (mealType === 'lateLunch') return mealName.includes('late lunch');
        if (mealType === 'lunch') return mealName.includes('lunch') && !mealName.includes('late');
        if (mealType === 'dinner') return mealName.includes('dinner');
        return false;
      });
      
      if (!targetMeal) return null;
      
      // Process stations and items for this meal only
      const stationsWithItems: Station[] = [];
      
      if (targetMeal.day_station && targetMeal.day_station.length > 0) {
        for (const station of targetMeal.day_station) {
          const items: MenuItem[] = [];
          
          if (station.day_station_item && station.day_station_item.length > 0) {
            for (const stationItem of station.day_station_item) {
              if (stationItem.item) {
                const item = stationItem.item as any;
                items.push({
                  id: item.id,
                  name: item.name,
                  vegetarian: item.vegetarian,
                  vegan: item.vegan,
                  gluten: item.gluten,
                  allergens: item.allergens || [],
                  serving_size: item.serving_size,
                  calories: item.calories,
                  protein_g: item.protein_g,
                  carbs_g: item.carbs_g,
                  fat_g: item.fat_g,
                  fiber_g: item.fiber_g,
                  sugar_g: item.sugar_g,
                  sodium_mg: item.sodium_mg,
                  protein_per_100cals: item.protein_per_100cals,
                  last_verified: item.last_verified,
                });
              }
            }
          }
          
          stationsWithItems.push({
            id: station.id,
            name: station.name,
            items,
          });
        }
      }
      
      return {
        id: targetMeal.id,
        name: targetMeal.meal_name,
        start_time: targetMeal.start_time || "",
        end_time: targetMeal.end_time || "",
        open: targetMeal.open,
        stations: stationsWithItems,
      };
    } catch (error) {
      console.error(`Error fetching detailed meal data for ${locationName} on ${date}:`, error);
      return null;
    }
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
      
      // Single optimized query with joins to get all menu data at once
      const { data: menuData, error: menuError } = await supabase
        .from("day_menu")
        .select(`
          id,
          is_published,
          day_meal (
            id,
            meal_name,
            meal_order,
            start_time,
            end_time,
            open,
            day_station (
              id,
              name,
              display_order,
              day_station_item (
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
              )
            )
          )
        `)
        .eq("location_name", locationName)
        .eq("serve_date", date)
        .maybeSingle();
      
      if (menuError || !menuData) {
        return null;
      }
      
      console.log('🚀 Optimized query result:', {
        hasMenu: !!menuData,
        mealsCount: menuData.day_meal?.length || 0,
        totalStations: menuData.day_meal?.reduce((acc: number, meal: any) => acc + (meal.day_station?.length || 0), 0) || 0,
        totalItems: menuData.day_meal?.reduce((acc: number, meal: any) => 
          acc + (meal.day_station?.reduce((stationAcc: number, station: any) => 
            stationAcc + (station.day_station_item?.length || 0), 0) || 0), 0) || 0
      });
      
      // Process the joined data into the expected structure
      const mealsByDate: MealsByDate = {};
      
      if (menuData.day_meal && menuData.day_meal.length > 0) {
        for (const meal of menuData.day_meal) {
          // Process stations and items for this meal
          const stationsWithItems: Station[] = [];
          
          if (meal.day_station && meal.day_station.length > 0) {
            for (const station of meal.day_station) {
              const items: MenuItem[] = [];
              
              if (station.day_station_item && station.day_station_item.length > 0) {
                for (const stationItem of station.day_station_item) {
                  if (stationItem.item) {
                    const item = stationItem.item as any; // Type assertion for joined query result
                    items.push({
                      id: item.id,
                      name: item.name,
                      vegetarian: item.vegetarian,
                      vegan: item.vegan,
                      gluten: item.gluten,
                      allergens: item.allergens || [],
                      serving_size: item.serving_size,
                      calories: item.calories,
                      protein_g: item.protein_g,
                      carbs_g: item.carbs_g,
                      fat_g: item.fat_g,
                      fiber_g: item.fiber_g,
                      sugar_g: item.sugar_g,
                      sodium_mg: item.sodium_mg,
                      protein_per_100cals: item.protein_per_100cals,
                      last_verified: item.last_verified,
                    });
                  }
                }
              }
              
              stationsWithItems.push({
                id: station.id,
                name: station.name,
                items,
              });
            }
          }
          
          // Create meal object
          const mealWithStations: Meal = {
            id: meal.id,
            name: meal.meal_name,
            start_time: meal.start_time || "",
            end_time: meal.end_time || "",
            open: meal.open,
            stations: stationsWithItems,
          };
          
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
              const meals: Meal[] = mealsData.map((meal: any) => ({
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
    getMealBasicInfo,
    getMealDetailedData,
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
