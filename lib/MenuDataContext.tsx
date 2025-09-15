import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "./supabase";

interface MenuItem {
  id: string;
  name: string;
  vegetarian?: boolean;
  vegan?: boolean;
  gluten?: boolean;
  allergens?: string[];
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

interface MenuDataContextType {
  menuData: DiningHallMenu[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  getMenuForLocation: (locationName: string) => DiningHallMenu | null;
}

const MenuDataContext = createContext<MenuDataContextType | undefined>(
  undefined
);

interface MenuDataProviderProps {
  children: ReactNode;
}

export function MenuDataProvider({ children }: MenuDataProviderProps) {
  const [menuData, setMenuData] = useState<DiningHallMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to format time from HH:MM:SS to H AM/PM (removes :00 minutes)
  const formatTime = (timeString: string): string => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    // Remove minutes if they are :00
    if (minutes === "00") {
      return `${displayHour} ${ampm}`;
    }
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const fetchAllMenuData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's date
      const today = new Date().toISOString().split("T")[0];

      // Fetch all locations
      const { data: locations, error: locationsError } = await supabase
        .from("location")
        .select("name");

      if (locationsError) {
        throw new Error(`Failed to fetch locations: ${locationsError.message}`);
      }

      if (!locations || locations.length === 0) {
        throw new Error("No locations found");
      }

      const allMenuData: DiningHallMenu[] = [];

      // Fetch menu data for each location
      for (const location of locations) {
        try {
          // Fetch today's menu for this location
          const { data: menu, error: menuError } = await supabase
            .from("day_menu")
            .select("id, is_published")
            .eq("location_name", location.name)
            .eq("serve_date", today)
            .single();

          if (menuError) {
            console.warn(
              `No menu found for ${location.name} today:`,
              menuError.message
            );
            continue;
          }

          // Fetch meals for this menu
          const { data: mealsData, error: mealsError } = await supabase
            .from("day_meal")
            .select(
              `
              id,
              meal_name,
              start_time,
              end_time,
              open
            `
            )
            .eq("day_menu_id", menu.id)
            .order("meal_order");

          if (mealsError) {
            console.error(
              `Error fetching meals for ${location.name}:`,
              mealsError
            );
            continue;
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
                `Error fetching stations for meal ${meal.meal_name} in ${location.name}:`,
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
                    allergens
                  )
                `
                )
                .eq("day_station_id", station.id);

              if (itemsError) {
                console.error(
                  `Error fetching items for station ${station.name} in ${location.name}:`,
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

          allMenuData.push({
            locationName: location.name,
            menuId: menu.id,
            isPublished: menu.is_published,
            meals: mealsWithStations,
          });
        } catch (locationError) {
          console.error(
            `Error processing location ${location.name}:`,
            locationError
          );
          // Continue with other locations even if one fails
        }
      }

      setMenuData(allMenuData);
      console.log(`✅ Preloaded menu data for ${allMenuData.length} locations`);
    } catch (error) {
      console.error("Error fetching menu data:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getMenuForLocation = (locationName: string): DiningHallMenu | null => {
    return menuData.find((menu) => menu.locationName === locationName) || null;
  };

  const refreshData = async () => {
    await fetchAllMenuData();
  };

  // Preload data on mount
  useEffect(() => {
    fetchAllMenuData();
  }, []);

  const value: MenuDataContextType = {
    menuData,
    loading,
    error,
    refreshData,
    getMenuForLocation,
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
