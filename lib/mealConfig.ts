// lib/mealConfig.ts

export type MealType = 'breakfast' | 'lunch' | 'lateLunch' | 'dinner';

export interface MealConfig {
  // Ordered list of meal types available at this location
  mealOrder: MealType[];
  // Mapping of database meal names to meal types
  mealNameMapping: Record<string, MealType>;
}

// Location-specific meal configurations based on meals.txt
export const LOCATION_MEAL_CONFIG: Record<string, MealConfig> = {
  'Hillenbrand': {
    mealOrder: ['breakfast', 'lunch', 'lateLunch', 'dinner'],
    mealNameMapping: {
      'brunch': 'breakfast',
      'lunch': 'lunch',
      'late lunch': 'lateLunch',
      'late-lunch': 'lateLunch',
      'dinner': 'dinner'
    }
  },
  'Wiley': {
    mealOrder: ['breakfast', 'lunch', 'dinner'],
    mealNameMapping: {
      'breakfast': 'breakfast',
      'lunch': 'lunch',
      'dinner': 'dinner'
    }
  },
  'Ford': {
    mealOrder: ['breakfast', 'lunch', 'dinner'],
    mealNameMapping: {
      'breakfast': 'breakfast',
      'lunch': 'lunch',
      'dinner': 'dinner'
    }
  },
  'Windsor': {
    mealOrder: ['lunch', 'lateLunch', 'dinner'],
    mealNameMapping: {
      'lunch': 'lunch',
      'late lunch': 'lateLunch',
      'late-lunch': 'lateLunch',
      'dinner': 'dinner'
    }
  },
  'Earhart': {
    mealOrder: ['breakfast', 'lunch', 'dinner'],
    mealNameMapping: {
      'breakfast': 'breakfast',
      'lunch': 'lunch',
      'dinner': 'dinner'
    }
  },
  '1bowl at Meredith Hall': {
    mealOrder: ['lunch', 'dinner'],
    mealNameMapping: {
      'lunch': 'lunch',
      'dinner': 'dinner'
    }
  },
  'Sushi Boss at Meredith Hall': {
    mealOrder: ['lunch', 'dinner'],
    mealNameMapping: {
      'lunch': 'lunch',
      'dinner': 'dinner'
    }
  },
  "Pete's Za at Tarkington Hall": {
    mealOrder: ['lunch', 'dinner'],
    mealNameMapping: {
      'lunch': 'lunch',
      'lunch/dinner': 'lunch', // Maps to lunch
      'dinner': 'dinner'
    }
  },
  'Lawson On-the-GO!': {
    mealOrder: ['breakfast'],
    mealNameMapping: {
      'breakfast': 'breakfast',
      'breakfast/lunch': 'breakfast',
      'lunch': 'breakfast' // Maps to breakfast since it's combined
    }
  },
  'Earhart On-the-GO!': {
    mealOrder: ['breakfast'],
    mealNameMapping: {
      'breakfast': 'breakfast',
      'breakfast/lunch': 'breakfast',
      'lunch': 'breakfast'
    }
  },
  'Ford On-the-GO!': {
    mealOrder: ['breakfast', 'dinner'],
    mealNameMapping: {
      'breakfast': 'breakfast',
      'breakfast/lunch': 'breakfast',
      'lunch': 'breakfast',
      'dinner': 'dinner'
    }
  },
  'Windsor On-the-GO!': {
    mealOrder: ['breakfast', 'dinner'],
    mealNameMapping: {
      'breakfast': 'breakfast',
      'breakfast/lunch': 'breakfast',
      'lunch': 'breakfast',
      'dinner': 'dinner'
    }
  }
};

// Helper function to get meal configuration for a location
export function getMealConfig(locationName: string): MealConfig {
  return LOCATION_MEAL_CONFIG[locationName] || {
    // Default fallback
    mealOrder: ['breakfast', 'lunch', 'dinner'],
    mealNameMapping: {
      'breakfast': 'breakfast',
      'brunch': 'breakfast',
      'lunch': 'lunch',
      'dinner': 'dinner'
    }
  };
}

// Helper function to get meal order for a location
export function getMealOrder(locationName: string): MealType[] {
  return getMealConfig(locationName).mealOrder;
}

// Helper function to map database meal name to meal type
export function mapMealNameToType(locationName: string, mealName: string): MealType | null {
  const config = getMealConfig(locationName);
  const normalizedName = mealName.toLowerCase().trim();
  return config.mealNameMapping[normalizedName] || null;
}

// Helper function to format meal type to display name
export function formatMealTypeName(mealType: MealType | string): string {
  const type = mealType.toLowerCase();
  
  if (type === 'breakfast') return 'Breakfast';
  if (type === 'lunch') return 'Lunch';
  if (type === 'latelunch' || type === 'late-lunch') return 'Late Lunch';
  if (type === 'dinner') return 'Dinner';
  if (type === 'brunch') return 'Brunch';
  
  // Handle camelCase like 'lateLunch'
  if (type.includes('late') && type.includes('lunch')) {
    return 'Late Lunch';
  }
  
  // Fallback: capitalize first letter of each word
  return type
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
