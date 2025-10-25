import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MealHours, ProcessedLocation } from '../types/menu';
import {
    formatLocationHours,
    getLocationLogo,
    getPlaceholderMealHours,
    isLocationOpen
} from '../utils/locationHelpers';

// ============================================================================
// Database Query
// ============================================================================

/**
 * Fetch meal hours from database for a specific location
 * @param locationName - Name of the location
 * @returns Array of meal hours or null if not found
 */
async function fetchMealHoursFromDatabase(locationName: string): Promise<MealHours[] | null> {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // First, get the day_menu ID
    let { data: dayMenu, error: dayMenuError } = await supabase
      .from('day_menu')
      .select('id')
      .eq('location_name', locationName)
      .eq('serve_date', today)
      .eq('is_published', true)
      .single();

    // If no published data found, try without the published filter
    if (dayMenuError || !dayMenu) {
      const { data: unpublishedMenu, error: unpublishedError } = await supabase
        .from('day_menu')
        .select('id')
        .eq('location_name', locationName)
        .eq('serve_date', today)
        .single();
      
      if (unpublishedError || !unpublishedMenu) {
        return null;
      }
      
      dayMenu = unpublishedMenu;
    }

    if (!dayMenu) {
      return null;
    }

    // Now fetch the meal data directly
    const { data: mealsData, error: mealsError } = await supabase
      .from('day_meal')
      .select('meal_name, start_time, end_time, open, meal_order')
      .eq('day_menu_id', dayMenu.id)
      .order('meal_order');

    if (mealsError || !mealsData) {
      return null;
    }

    // Transform the data to match MealHours interface
    const mealHours: MealHours[] = mealsData.map((meal: any) => ({
      meal_name: meal.meal_name,
      start_time: meal.start_time,
      end_time: meal.end_time,
      open: meal.open,
    }));

    return mealHours;
  } catch (error) {
    console.error(`Error fetching meal hours for ${locationName}:`, error);
    return null;
  }
}

/**
 * Fetch tomorrow's meal hours from database for a specific location
 * @param locationName - Name of the location
 * @returns Array of meal hours or null if not found
 */
async function fetchTomorrowMealHours(locationName: string): Promise<MealHours[] | null> {
  try {
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Get the day_menu ID for tomorrow
    const { data: dayMenu, error: dayMenuError } = await supabase
      .from('day_menu')
      .select('id')
      .eq('location_name', locationName)
      .eq('serve_date', tomorrowStr)
      .single();

    if (dayMenuError || !dayMenu) {
      return null;
    }

    // Fetch tomorrow's meal data
    const { data: mealsData, error: mealsError } = await supabase
      .from('day_meal')
      .select('meal_name, start_time, end_time, open, meal_order')
      .eq('day_menu_id', dayMenu.id)
      .order('meal_order');

    if (mealsError || !mealsData) {
      return null;
    }

    // Transform the data to match MealHours interface
    return mealsData.map((meal: any) => ({
      meal_name: meal.meal_name,
      start_time: meal.start_time,
      end_time: meal.end_time,
      open: meal.open,
    }));
  } catch (error) {
    console.error(`Error fetching tomorrow's meal hours for ${locationName}:`, error);
    return null;
  }
}

// ============================================================================
// Hook
// ============================================================================

interface Location {
  name: string;
  type: number;
  meals?: Array<{
    name: string;
    start_time: string;
    end_time: string;
    open: boolean;
  }>;
}

interface GroupedLocations {
  diningHalls: ProcessedLocation[];
  quickBites: ProcessedLocation[];
  onTheGo: ProcessedLocation[];
}

/**
 * Hook to process locations and determine their current status
 * Fetches meal hours from database and formats display information
 */
export function useLocationStatus(locations: Location[]) {
  const [processedLocations, setProcessedLocations] = useState<GroupedLocations>({
    diningHalls: [],
    quickBites: [],
    onTheGo: []
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (locations.length === 0) return;

    const processLocations = async () => {
      setIsProcessing(true);
      
      try {
        const processed = await Promise.all(
          locations.map(async (location, index) => {
            // Determine meal hours priority:
            // 1. Database meal hours (most accurate)
            // 2. Context meal data (from menu data)
            // 3. Placeholder hours (fallback)
            let mealHours: MealHours[] = [];
            
            const dbMealHours = await fetchMealHoursFromDatabase(location.name);
            
            if (dbMealHours) {
              // Check if today's data has valid times
              const hasValidTimes = dbMealHours.some(meal => meal.start_time && meal.end_time);
              
              if (!hasValidTimes) {
                // If today's data is incomplete, try to fetch tomorrow's data
                const tomorrowMealHours = await fetchTomorrowMealHours(location.name);
                const firstTomorrowMeal = tomorrowMealHours?.find(meal => meal.start_time);
                
                if (firstTomorrowMeal) {
                  // Use tomorrow's first meal for "Opens tomorrow at..." display
                  mealHours = [{
                    meal_name: firstTomorrowMeal.meal_name,
                    start_time: firstTomorrowMeal.start_time,
                    end_time: firstTomorrowMeal.end_time,
                    open: false // Tomorrow's meal, so not open today
                  }];
                } else {
                  mealHours = dbMealHours; // Fallback to today's data
                }
              } else {
                mealHours = dbMealHours;
              }
            } else if (location.meals && location.meals.length > 0) {
              mealHours = location.meals.map((meal) => ({
                meal_name: meal.name,
                start_time: meal.start_time,
                end_time: meal.end_time,
                open: meal.open,
              }));
            } else {
              mealHours = getPlaceholderMealHours();
            }

            const isOpen = isLocationOpen(mealHours);
            const formattedHours = formatLocationHours(mealHours);
            const logo = getLocationLogo(location.name, location.type);

            return {
              id: index + 1,
              name: location.name,
              type: location.type,
              hours: formattedHours,
              status: (isOpen ? "open" : "closed") as "open" | "closed",
              image: logo,
              mealHours: mealHours,
            };
          })
        );

        // Group by location type
        const diningHalls = processed.filter(loc => loc.type === 0);
        const quickBites = processed.filter(loc => loc.type === 1);
        const onTheGo = processed.filter(loc => loc.type === 2);

        setProcessedLocations({ diningHalls, quickBites, onTheGo });
      } catch (error) {
        console.error('Error processing locations:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    processLocations();
  }, [locations]);

  // Memoize the grouped locations to prevent unnecessary re-renders
  const groupedLocations = useMemo(() => processedLocations, [processedLocations]);

  return {
    ...groupedLocations,
    isProcessing
  };
}