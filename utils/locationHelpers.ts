import {
    earhartLogo,
    earhartOtgLogo,
    fordLogo,
    fordOtgLogo,
    hillenbrandLogo,
    lawsonOtgLogo,
    oneBowlLogo,
    petesZaLogo,
    sushiBossLogo,
    wileyLogo,
    windsorLogo,
    windsorOtgLogo,
} from "../assets/images/logos/logos";
import { formatTime, getCurrentTimeInEST } from "../lib/timezone-utils";
import { MealHours } from "../types/menu";
  
  // ============================================================================
  // Logo Mapping
  // ============================================================================
  
  const ON_THE_GO_LOGOS: Record<string, any> = {
    'Earhart On-the-GO!': earhartOtgLogo,
    'Ford On-the-GO!': fordOtgLogo,
    'Windsor On-the-GO!': windsorOtgLogo,
    'Lawson On-the-GO!': lawsonOtgLogo,
  };
  
  const REGULAR_LOGOS: Record<string, any> = {
    'Wiley': wileyLogo,
    'Ford': fordLogo,
    'Windsor': windsorLogo,
    'Earhart': earhartLogo,
    'Hillenbrand': hillenbrandLogo,
    "Pete's Za at Tarkington Hall": petesZaLogo,
    'Sushi Boss at Meredith Hall': sushiBossLogo,
    '1bowl at Meredith Hall': oneBowlLogo,
  };
  
  /**
   * Get the appropriate logo for a location based on its name and type
   * @param name - Location name
   * @param type - Location type (0 = Dining Hall, 1 = Quick Bites, 2 = On-The-GO!)
   * @returns Logo asset
   */
  export function getLocationLogo(name: string, type: number): any {
    // On-The-GO! locations (type 2) use SVG logos
    if (type === 2) {
      return ON_THE_GO_LOGOS[name] || fordOtgLogo;
    }
    
    // Dining Halls and Quick Bites (type 0, 1) use PNG logos
    return REGULAR_LOGOS[name] || wileyLogo;
  }
  
  // ============================================================================
  // Hours Formatting
  // ============================================================================
  
  /**
   * Format meal hours for display on location cards
   * Shows current meal, next meal, or closed status
   * @param mealHours - Array of meal hours for the location
   * @returns Formatted hours string
   */
  export function formatLocationHours(mealHours: MealHours[]): string {
    if (!mealHours || mealHours.length === 0) return "Closed Today";
  
  const openMeals = mealHours.filter((meal) => meal.open);
  
  // Check if we have any meals with valid times (for tomorrow's display)
  const mealsWithTimes = mealHours.filter(meal => meal.start_time && meal.end_time);
  
  // If no open meals but we have meals with times, continue to tomorrow logic
  if (openMeals.length === 0 && mealsWithTimes.length === 0) return "Closed Today";
  
    // Get current time in EST
    const { hours, minutes } = getCurrentTimeInEST();
    const currentTime = hours * 60 + minutes;
  
    // Find currently open meal
    const currentMeal = openMeals.find((meal) => {
      if (!meal.start_time || !meal.end_time) return false;
      const [startHour, startMin] = meal.start_time.split(":").map(Number);
      const [endHour, endMin] = meal.end_time.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      return currentTime >= startTime && currentTime <= endTime;
    });
  
    if (currentMeal) {
      return `${currentMeal.meal_name}: ${formatTime(currentMeal.start_time)} - ${formatTime(currentMeal.end_time)}`;
    }
  
    // Find next meal today
    const nextMeal = openMeals.find((meal) => {
      if (!meal.start_time) return false;
      const [startHour, startMin] = meal.start_time.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      return startTime > currentTime;
    });
  
    if (nextMeal) {
      return `Next: ${formatTime(nextMeal.start_time)} - ${formatTime(nextMeal.end_time)}`;
    }
  
  // If no current or next meal today, show the first meal tomorrow
  const allMeals = mealHours.filter(meal => meal.start_time);
  const firstMeal = allMeals[0];
  
  if (firstMeal && firstMeal.start_time) {
    return `Opens tomorrow at ${formatTime(firstMeal.start_time)}`;
  }

  return "Closed Today";
  }
  
  /**
   * Determine if a location is currently open based on meal hours
   * @param mealHours - Array of meal hours for the location
   * @returns true if location is currently open
   */
  export function isLocationOpen(mealHours: MealHours[]): boolean {
    if (!mealHours || mealHours.length === 0) return false;
    
    const openMeals = mealHours.filter((meal) => meal.open);
    if (openMeals.length === 0) return false;
  
    // Get current time in EST
    const { hours, minutes } = getCurrentTimeInEST();
    const currentTime = hours * 60 + minutes;
  
    // Check if any meal is currently open
    return openMeals.some((meal) => {
      if (!meal.start_time || !meal.end_time) return false;
      const [startHour, startMin] = meal.start_time.split(":").map(Number);
      const [endHour, endMin] = meal.end_time.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      return currentTime >= startTime && currentTime <= endTime;
    });
  }
  
  // ============================================================================
  // Default/Placeholder Hours
  // ============================================================================
  
  /**
   * Get placeholder meal hours for when database data is unavailable
   * @returns Default meal hours array
   */
  export function getPlaceholderMealHours(): MealHours[] {
    return [
      { meal_name: "Breakfast", start_time: "07:00", end_time: "10:00", open: true },
      { meal_name: "Lunch", start_time: "11:00", end_time: "14:00", open: true },
      { meal_name: "Dinner", start_time: "17:00", end_time: "20:00", open: true },
    ];
  }