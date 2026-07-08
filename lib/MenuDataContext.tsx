import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { MenuItem, Meal, MealsByDate, Station } from "../types/menu";
import { isJWTExpiredError } from "./authUtils";
import { seedCollectionStatus } from "./collectionStatusCache";
import { NESTED_MENU_ITEM_SELECT } from "./itemSelectColumns";
import { menuCache } from "./menuCache";
import { locationCache } from "./locationCache";
import {
    ensureGlobalMenuVersionFresh,
    getMostRecentMenuBoundaryMs,
    loadMenuVersionConfig,
} from "./menuVersion";
import {
    getCurrentMealTypeByHour,
    getMealOrder,
    mapMealNameToType,
} from "./mealConfig";
import { supabase } from "./supabase";
import { getTodayDateString } from "./timezone-utils";

interface MenuDataByDate {
  locationName: string;
  menusByDate: Map<string, MealsByDate>; // key: YYYY-MM-DD
}

interface DiningHallMenu {
  locationName: string;
  menuId: string;
  isPublished: boolean;
  meals: Meal[];
}

interface LocationInfo {
  name: string;
  type: number; // 0 = Dining Hall, 1 = Quick Bites, 2 = On-The-GO!
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
  getMenuForDate: (
    locationName: string,
    date: string,
  ) => Promise<MealsByDate | null>;
  getMealBasicInfo: (
    locationName: string,
    date: string,
  ) => Promise<MealsByDate | null>;
  getMealDetailedData: (
    locationName: string,
    date: string,
    mealType: string,
  ) => Promise<Meal | null>;
  prefetchLocationMenu: (locationName: string) => Promise<void>;
  getAvailableLocations: () => Promise<string[]>;
  refreshLocations: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  isDateLoading: (date: string) => boolean;
  isDateReady: (date: string) => boolean;
  clearBasicMealCache: () => void;
}

const MenuDataContext = createContext<MenuDataContextType | undefined>(
  undefined,
);

interface MenuDataProviderProps {
  children: ReactNode;
}

function parseMenuItem(item: Record<string, unknown>): MenuItem {
  return {
    id: item.id as string,
    name: item.name as string,
    vegetarian: item.vegetarian as boolean | undefined,
    vegan: item.vegan as boolean | undefined,
    gluten: item.gluten as boolean | undefined,
    allergens: (item.allergens as string[]) || [],
    serving_size: item.serving_size as string | undefined,
    calories: item.calories as number | undefined,
    protein_g: item.protein_g as number | undefined,
    carbs_g: item.carbs_g as number | undefined,
    fat_g: item.fat_g as number | undefined,
    fiber_g: item.fiber_g as number | undefined,
    sugar_g: item.sugar_g as number | undefined,
    sodium_mg: item.sodium_mg as number | undefined,
    protein_per_100cals: item.protein_per_100cals as number | undefined,
    last_verified: item.last_verified as string | undefined,
    is_collection: item.is_collection as boolean | undefined,
    user_id: item.user_id as string | null | undefined,
  };
}

function buildMealFromRaw(meal: any): Meal {
  const stationsWithItems: Station[] = [];

  if (meal.day_station && meal.day_station.length > 0) {
    for (const station of meal.day_station) {
      const items: MenuItem[] = [];

      if (station.day_station_item && station.day_station_item.length > 0) {
        for (const stationItem of station.day_station_item) {
          if (stationItem.item) {
            items.push(parseMenuItem(stationItem.item));
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

  const menuItems = stationsWithItems.flatMap((station) => station.items);
  if (menuItems.length > 0) {
    seedCollectionStatus(menuItems);
  }

  return {
    id: meal.id,
    name: meal.meal_name,
    start_time: meal.start_time || "",
    end_time: meal.end_time || "",
    open: meal.open,
    stations: stationsWithItems,
  };
}

export function MenuDataProvider({ children }: MenuDataProviderProps) {
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<MenuDataByDate | null>(null);
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());
  const [basicMealCache, setBasicMealCache] = useState<
    Map<string, MealsByDate>
  >(new Map());
  // Detailed menu cache with meal-specific keys: "locationName:date:mealType"
  const [detailedMenuCache, setDetailedMenuCache] = useState<Map<string, Meal>>(
    new Map(),
  );
  // Known day_menu.last_updated versions, keyed "locationName:date".
  // Used to validate the persistent (AsyncStorage) menu cache without
  // refetching the full nested menu payload on every app launch.
  const menuVersionsRef = useRef<
    Map<string, { version: string | null; fetchedAt: number }>
  >(new Map());

  const recordMenuVersion = (
    locationName: string,
    date: string,
    version: string | null,
  ) => {
    menuVersionsRef.current.set(`${locationName}:${date}`, {
      version,
      fetchedAt: Date.now(),
    });
  };

  // Probe just the day_menu.last_updated stamp (a single tiny row) to decide
  // whether a cached payload is still current.
  const probeMenuVersion = async (
    locationName: string,
    date: string,
  ): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from("day_menu")
        .select("last_updated")
        .eq("location_name", locationName)
        .eq("serve_date", date)
        .maybeSingle();
      const version = (data?.last_updated as string | undefined) ?? null;
      recordMenuVersion(locationName, date, version);
      return version;
    } catch {
      return null;
    }
  };

  // Returns the authoritative version for a location/date, probing only when
  // a cron boundary has passed since the last confirmation.
  const resolveMenuVersion = async (
    locationName: string,
    date: string,
  ): Promise<string | null> => {
    const isPastDate = date < getTodayDateString();
    if (isPastDate) {
      return menuVersionsRef.current.get(`${locationName}:${date}`)?.version ?? null;
    }

    await ensureGlobalMenuVersionFresh();

    const key = `${locationName}:${date}`;
    const known = menuVersionsRef.current.get(key);
    const boundaryMs = getMostRecentMenuBoundaryMs();

    if (known && known.fetchedAt >= boundaryMs) {
      return known.version;
    }

    return probeMenuVersion(locationName, date);
  };

  // Switch to a new location - preserve cache for instant switching back
  const switchLocation = async (locationName: string): Promise<void> => {
    if (currentLocation === locationName && menuData) {
      return; // Already on this location
    }

    // OPTIMIZED: Don't clear cache when switching locations
    // Preserve cache so users can switch back instantly
    // Cache will naturally expire or can be cleared on explicit refresh

    // Clear existing data and switch
    setCurrentLocation(locationName);
    setMenuData({
      locationName,
      menusByDate: new Map(),
    });
    setError(null);
  };

  // Get basic meal info only (for fast loading)
  const getMealBasicInfo = async (
    locationName: string,
    date: string,
  ): Promise<MealsByDate | null> => {
    // Check in-memory (L1) cache first
    const cacheKey = `${locationName}:${date}`;
    if (basicMealCache.has(cacheKey)) {
      return basicMealCache.get(cacheKey)!;
    }

    // Check persistent (L2) cache, validating against the server version.
    const isPastDate = date < getTodayDateString();
    const persisted = await menuCache.getBasicDay<MealsByDate>(
      locationName,
      date,
    );
    if (persisted) {
      const serveFromCache = async () => {
        setBasicMealCache((prev) => new Map(prev).set(cacheKey, persisted.data));
        return persisted.data;
      };
      if (isPastDate) {
        // Past-date menus are immutable; serve without a version check.
        return serveFromCache();
      }
      const version = await resolveMenuVersion(locationName, date);
      if (version !== null && version === persisted.version) {
        return serveFromCache();
      }
      // Version changed (or unknown): fall through to a full fetch.
    }

    // Fetch from database if not cached
    try {
      const { data: menuData, error: menuError } = await supabase
        .from("day_menu")
        .select(
          `
          id,
          is_published,
          last_updated,
          day_meal (
            id,
            meal_name,
            meal_order,
            start_time,
            end_time,
            open
          )
        `,
        )
        .eq("location_name", locationName)
        .eq("serve_date", date)
        .maybeSingle();

      if (menuError || !menuData) {
        return null;
      }

      const version = (menuData.last_updated as string | undefined) ?? null;
      recordMenuVersion(locationName, date, version);

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

          const mealName = meal.meal_name.toLowerCase().trim();

          // Use location-specific meal mapping
          const mealType = mapMealNameToType(locationName, mealName);
          if (mealType) {
            mealsByDate[mealType] = mealBasic;
          }
        }
      }

      // Cache the entire day (all meals for this date)
      if (Object.keys(mealsByDate).length > 0) {
        setBasicMealCache((prev) => new Map(prev).set(cacheKey, mealsByDate));
        if (version !== null) {
          void menuCache.setBasicDay(locationName, date, version, mealsByDate);
        }
      }

      return mealsByDate;
    } catch (error) {
      console.error(
        `Error fetching basic meal info for ${locationName} on ${date}:`,
        error,
      );
      return null;
    }
  };

  // Get detailed data for a specific meal only
  const getMealDetailedData = async (
    locationName: string,
    date: string,
    mealType: string,
  ): Promise<Meal | null> => {
    // OPTIMIZED: Check in-memory (L1) cache first with meal-specific key
    const cacheKey = `${locationName}:${date}:${mealType}`;
    if (detailedMenuCache.has(cacheKey)) {
      return detailedMenuCache.get(cacheKey)!;
    }

    // Check persistent (L2) cache, validating against the server version.
    const isPastDate = date < getTodayDateString();
    const persisted = await menuCache.getDetailedMeal<Meal>(
      locationName,
      date,
      mealType,
    );
    if (persisted) {
      const serveFromCache = async () => {
        setDetailedMenuCache((prev) =>
          new Map(prev).set(cacheKey, persisted.data),
        );
        return persisted.data;
      };
      if (isPastDate) {
        return serveFromCache();
      }
      const cachedVersion = await resolveMenuVersion(locationName, date);
      if (cachedVersion !== null && cachedVersion === persisted.version) {
        return serveFromCache();
      }
      // Version changed (or unknown): fall through to a full fetch.
    }

    try {
      const { data: menuData, error: menuError } = await supabase
        .from("day_menu")
        .select(
          `
          id,
          last_updated,
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
                  ${NESTED_MENU_ITEM_SELECT}
                )
              )
            )
          )
        `,
        )
        .eq("location_name", locationName)
        .eq("serve_date", date)
        .maybeSingle();

      if (menuError || !menuData) {
        return null;
      }

      const version = (menuData.last_updated as string | undefined) ?? null;
      recordMenuVersion(locationName, date, version);

      let requestedMeal: Meal | null = null;
      const cacheUpdates = new Map<string, Meal>();

      for (const rawMeal of menuData.day_meal || []) {
        const mappedType = mapMealNameToType(locationName, rawMeal.meal_name);
        if (!mappedType) continue;

        const mealData = buildMealFromRaw(rawMeal);
        const mealCacheKey = `${locationName}:${date}:${mappedType}`;
        cacheUpdates.set(mealCacheKey, mealData);

        if (mappedType === mealType) {
          requestedMeal = mealData;
        }
      }

      if (!requestedMeal) {
        return null;
      }

      setDetailedMenuCache((prev) => {
        const next = new Map(prev);
        for (const [key, meal] of cacheUpdates.entries()) {
          next.set(key, meal);
        }
        return next;
      });

      if (version !== null) {
        for (const [key, meal] of cacheUpdates.entries()) {
          const [, , mappedMealType] = key.split(":");
          void menuCache.setDetailedMeal(
            locationName,
            date,
            mappedMealType,
            version,
            meal,
          );
        }
      }

      return requestedMeal;
    } catch (error) {
      console.error(
        `Error fetching detailed meal data for ${locationName} on ${date}:`,
        error,
      );
      return null;
    }
  };

  // Get menu data for a specific location and date
  const getMenuForDate = async (
    locationName: string,
    date: string,
  ): Promise<MealsByDate | null> => {
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
      setLoadingDates((prev) => new Set(prev).add(date));

      // Single optimized query with joins to get all menu data at once
      const { data: menuData, error: menuError } = await supabase
        .from("day_menu")
        .select(
          `
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
                  ${NESTED_MENU_ITEM_SELECT}
                )
              )
            )
          )
        `,
        )
        .eq("location_name", locationName)
        .eq("serve_date", date)
        .maybeSingle();

      if (menuError || !menuData) {
        return null;
      }

      // Process the joined data into the expected structure
      const mealsByDate: MealsByDate = {};

      if (menuData.day_meal && menuData.day_meal.length > 0) {
        for (const meal of menuData.day_meal) {
          const mealWithStations = buildMealFromRaw(meal);

          // Map meal to the correct key
          const mealName = meal.meal_name.toLowerCase();
          if (mealName.includes("breakfast")) {
            mealsByDate.breakfast = mealWithStations;
          } else if (mealName.includes("late lunch")) {
            if (locationName === "Windsor") {
              mealsByDate.lateLunch = mealWithStations;
            }
          } else if (mealName.includes("lunch")) {
            mealsByDate.lunch = mealWithStations;
          } else if (mealName.includes("dinner")) {
            mealsByDate.dinner = mealWithStations;
          }
        }
      }

      // Update menuData with this date
      setMenuData((prev) => {
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
      console.error(
        `Error fetching menu for ${locationName} on ${date}:`,
        error,
      );
      return null;
    } finally {
      setLoadingDates((prev) => {
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

  // Load locations on mount; prune stale persistent menu cache entries.
  useEffect(() => {
    void loadMenuVersionConfig();
    refreshLocations();
    void menuCache.prune();
  }, []);

  // Helper function to map locations and menus to LocationInfo[]
  const mapLocationsToLocationInfo = (
    locationsData: Array<{ name: string; type: number }>,
    menuMap: Map<string, any>,
  ): LocationInfo[] => {
    return locationsData.map((location) => {
      const menu = menuMap.get(location.name);

      if (!menu) {
        return {
          name: location.name,
          type: location.type,
          hasMenu: false,
        };
      }

      // Process meal data from joined query
      const meals: Meal[] = (menu.day_meal || [])
        .sort((a: any, b: any) => (a.meal_order || 0) - (b.meal_order || 0))
        .map((meal: any) => ({
          id: meal.id,
          name: meal.meal_name,
          start_time: meal.start_time || "",
          end_time: meal.end_time || "",
          open: meal.open,
          stations: [], // Empty for basic info
        }));

      return {
        name: location.name,
        type: location.type,
        hasMenu: true,
        menuId: menu.id,
        isPublished: menu.is_published,
        meals: meals.length > 0 ? meals : undefined,
      };
    });
  };

  // Helper function to sort locations (preserves existing sorting logic)
  const sortLocations = (locationsList: LocationInfo[]): LocationInfo[] => {
    const diningHallOrder = [
      "Ford",
      "Wiley",
      "Windsor",
      "Earhart",
      "Hillenbrand",
    ];

    return locationsList.sort((a, b) => {
      // Only sort dining halls (type 0)
      if (a.type !== 0 || b.type !== 0) {
        return 0; // Keep non-dining halls in their original order
      }

      const aIndex = diningHallOrder.indexOf(a.name);
      const bIndex = diningHallOrder.indexOf(b.name);

      // If both are in the order list, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one is in the order list, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // If neither is in the order list, maintain original order
      return 0;
    });
  };

  const invalidateBasicMealCacheIfVersionChanged = (
    locationName: string,
    date: string,
    nextVersion: string | null,
  ) => {
    const key = `${locationName}:${date}`;
    const known = menuVersionsRef.current.get(key);
    if (known?.version === nextVersion) {
      return;
    }

    setBasicMealCache((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });

    setDetailedMenuCache((prev) => {
      const prefix = `${locationName}:${date}:`;
      let changed = false;
      const next = new Map(prev);
      for (const cacheKey of prev.keys()) {
        if (cacheKey.startsWith(prefix)) {
          next.delete(cacheKey);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  // Fetch locations with basic menu info for today
  const refreshLocations = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Get today's date in EST
      const today = getTodayDateString();

      // Fetch all locations (static list — long-lived AsyncStorage cache)
      const cachedLocations = await locationCache.get();
      let { data: locationsData, error: locationsError } = await supabase
        .from("location")
        .select("name, type");

      if (locationsData?.length) {
        void locationCache.set(locationsData);
      } else if (cachedLocations) {
        locationsData = cachedLocations;
        locationsError = null;
      }

      // If JWT expired, try to refresh and retry once
      if (locationsError && isJWTExpiredError(locationsError)) {
        try {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            // Retry the query after refresh
            const retryResult = await supabase
              .from("location")
              .select("name, type");
            locationsData = retryResult.data;
            locationsError = retryResult.error;
            if (locationsData?.length) {
              void locationCache.set(locationsData);
            }
          }
        } catch (refreshErr) {
          console.warn("Error refreshing session:", refreshErr);
        }
      }

      if (locationsError) {
        throw new Error(`Failed to fetch locations: ${locationsError.message}`);
      }

      // OPTIMIZED: Single query to fetch all menus for today with joined meal data
      // This replaces the N+1 query problem (30+ queries -> 1 query)
      const { data: allMenus, error: menusError } = await supabase
        .from("day_menu")
        .select(
          `
          id,
          is_published,
          location_name,
          last_updated,
          day_meal (
            id,
            meal_name,
            meal_order,
            start_time,
            end_time,
            open
          )
        `,
        )
        .eq("serve_date", today);

      // If JWT expired, try to refresh and retry once
      if (menusError && isJWTExpiredError(menusError)) {
        try {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            // Retry the query after refresh
            const retryResult = await supabase
              .from("day_menu")
              .select(
                `
                id,
                is_published,
                location_name,
                last_updated,
                day_meal (
                  id,
                  meal_name,
                  meal_order,
                  start_time,
                  end_time,
                  open
                )
              `,
              )
              .eq("serve_date", today);
            if (!retryResult.error) {
              // Use retry result if successful
              const menuMap: Map<string, any> = new Map(
                (retryResult.data || []).map((menu: any) => [
                  menu.location_name,
                  menu,
                ]),
              );
              for (const menu of retryResult.data || []) {
                const nextVersion =
                  (menu.last_updated as string | undefined) ?? null;
                invalidateBasicMealCacheIfVersionChanged(
                  menu.location_name,
                  today,
                  nextVersion,
                );
                recordMenuVersion(menu.location_name, today, nextVersion);
              }
              const locationsList = mapLocationsToLocationInfo(
                locationsData || [],
                menuMap,
              );
              const sortedLocations = sortLocations(locationsList);
              setLocations(sortedLocations);
              return;
            }
          }
        } catch (refreshErr) {
          console.warn("Error refreshing session:", refreshErr);
        }
      }

      if (menusError) {
        throw new Error(`Failed to fetch menus: ${menusError.message}`);
      }

      // Create a map of location_name -> menu data for efficient lookup
      const menuMap: Map<string, any> = new Map(
        (allMenus || []).map((menu: any) => [menu.location_name, menu]),
      );

      // Record fresh versions for today so meal fetches can validate the
      // persistent cache without an extra probe.
      for (const menu of allMenus || []) {
        const nextVersion = (menu.last_updated as string | undefined) ?? null;
        invalidateBasicMealCacheIfVersionChanged(
          menu.location_name,
          today,
          nextVersion,
        );
        recordMenuVersion(menu.location_name, today, nextVersion);
      }

      // Map locations to LocationInfo[] structure (maintains backward compatibility)
      const locationsList = mapLocationsToLocationInfo(
        locationsData || [],
        menuMap,
      );

      // Sort locations using helper function
      const sortedLocations = sortLocations(locationsList);
      setLocations(sortedLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data when app returns from background
  const refreshAllData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Clear cached menu data
      setMenuData((prev) =>
        prev
          ? {
              ...prev,
              menusByDate: new Map(),
            }
          : null,
      );

      // Reload locations
      await refreshLocations();

      // If we have a current location, reload today's menu
      if (currentLocation) {
        const today = getTodayDateString();
        await getMenuForDate(currentLocation, today);
      }
    } catch (error) {
      console.error("Error refreshing all data:", error);
      setError("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  // Get available locations from the database
  const getAvailableLocations = async (): Promise<string[]> => {
    try {
      // If already loaded, return cached locations
      if (locations.length > 0) {
        return locations.map((loc) => loc.name);
      }

      // If not loaded, fetch them
      await refreshLocations();
      return locations.map((loc) => loc.name);
    } catch (error) {
      console.error("Error fetching locations:", error);
      return [];
    }
  };

  // Prefetch only the current meal for a location (reduces egress; other meals load on demand)
  const prefetchLocationMenu = async (locationName: string): Promise<void> => {
    try {
      const today = getTodayDateString();
      const mealOrder = getMealOrder(locationName);
      const currentMeal = getCurrentMealTypeByHour();
      const mealToPrefetch = mealOrder.includes(currentMeal)
        ? currentMeal
        : mealOrder[0];
      const cacheKey = `${locationName}:${today}:${mealToPrefetch}`;
      if (detailedMenuCache.has(cacheKey)) return;
      await getMealDetailedData(locationName, today, mealToPrefetch);
    } catch (error) {
      console.warn(`Error prefetching menu for ${locationName}:`, error);
    }
  };

  // Clear basic meal cache manually
  const clearBasicMealCache = () => {
    setBasicMealCache(new Map());
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
    prefetchLocationMenu,
    getAvailableLocations,
    refreshLocations,
    refreshAllData,
    isDateLoading,
    isDateReady,
    clearBasicMealCache,
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
