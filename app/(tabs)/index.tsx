import { useRouter } from "expo-router";
import * as React from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import DiningHallCard from "../../components/DiningHallCard";
import { useAuth } from "../../contexts/AuthContext";
import { useMenuData } from "../../lib/MenuDataContext";
import { getCurrentTimeInEST } from "../../lib/timezone-utils";

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
} from "../../assets/images/logos/logos";

interface MealHours {
  meal_name: string;
  start_time: string;
  end_time: string;
  open: boolean;
}

interface DiningHall {
  id: number;
  name: string;
  type: number; // 0 = Dining Hall, 1 = Quick Bites, 2 = On-The-GO!
  hours: string;
  status: "open" | "closed";
  image: any;
  mealHours: MealHours[];
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locations, menuData, loading, error, refreshLocations } = useMenuData();
  const [refreshing, setRefreshing] = React.useState(false);


  // Logo mapping based on location type
  const getLocationLogo = (name: string, type: number) => {
    // On-The-GO! locations (type 2) use SVG logos
    if (type === 2) {
      const otgLogoMap: { [key: string]: any } = {
        'Earhart On-the-GO!': earhartOtgLogo,
        'Ford On-the-GO!': fordOtgLogo,
        'Windsor On-the-GO!': windsorOtgLogo,
        'Lawson On-the-GO!': lawsonOtgLogo,
      };
      return otgLogoMap[name] || fordOtgLogo; // fallback to ford
    }
    
    // Dining Halls and Quick Bites (type 0, 1) use PNG logos
    const regularLogoMap: { [key: string]: any } = {
      'Wiley': wileyLogo,
      'Ford': fordLogo,
      'Windsor': windsorLogo,
      'Earhart': earhartLogo,
      'Hillenbrand': hillenbrandLogo,
      // Quick Bites logos
      "Pete's Za at Tarkington Hall": petesZaLogo,
      'Sushi Boss at Meredith Hall': sushiBossLogo,
      '1bowl at Meredith Hall': oneBowlLogo,
    };
    return regularLogoMap[name] || wileyLogo; // fallback to wiley
  };

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

  // Function to get meal hours from database for specific locations
  const getMealHoursFromDatabase = async (locationName: string, locationType: number): Promise<MealHours[] | null> => {
    try {
      // Import supabase client
      const { supabase } = await import('../../lib/supabase');
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Query the database for today's meal data
      const { data: dayMenu, error: dayMenuError } = await supabase
        .from('day_menu')
        .select(`
          id,
          day_meal (
            meal_name,
            start_time,
            end_time,
            open,
            meal_order
          )
        `)
        .eq('location_name', locationName)
        .eq('serve_date', today)
        .eq('is_published', true)
        .single();

      if (dayMenuError || !dayMenu) {
        console.log(`No menu data found for ${locationName} on ${today}`);
        return null;
      }

      // Transform the data to match our MealHours interface
      const mealHours: MealHours[] = dayMenu.day_meal
        .sort((a: any, b: any) => a.meal_order - b.meal_order)
        .map((meal: any) => ({
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
  };

  // Function to format hours for display
  const formatHours = (mealHours: MealHours[]): string => {
    if (!mealHours || mealHours.length === 0) return "Closed Today";

    const openMeals = mealHours.filter((meal) => meal.open);
    if (openMeals.length === 0) return "Closed Today";

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
    const firstMeal = openMeals[0];
    if (firstMeal && firstMeal.start_time) {
      return `Opens tomorrow at ${formatTime(firstMeal.start_time)}`;
    }

    // Fallback
    return "Closed Today";
  };

  // State for processed locations with database meal hours
  const [processedLocations, setProcessedLocations] = React.useState<{
    diningHalls: any[];
    quickBites: any[];
    onTheGo: any[];
  }>({ diningHalls: [], quickBites: [], onTheGo: [] });

  // Process locations with database meal hours
  React.useEffect(() => {
    const processLocations = async () => {
      const { hours, minutes } = getCurrentTimeInEST();
      const currentTime = hours * 60 + minutes;

      const processedLocations = await Promise.all(
        locations.map(async (location, index) => {
          let mealHours: MealHours[] = [];
          
          // Try to get meal hours from database first
          const dbMealHours = await getMealHoursFromDatabase(location.name, location.type);
          
          if (dbMealHours) {
            // Use database meal hours
            mealHours = dbMealHours;
          } else if (location.meals && location.meals.length > 0) {
            // Use real meal hours from loaded menu data for Dining Halls
            mealHours = location.meals.map((meal) => ({
              meal_name: meal.name,
              start_time: meal.start_time,
              end_time: meal.end_time,
              open: meal.open,
            }));
          } else {
            // Use placeholder meal hours until real data loads (for Dining Halls)
            mealHours = [
              { meal_name: "Breakfast", start_time: "07:00", end_time: "10:00", open: true },
              { meal_name: "Lunch", start_time: "11:00", end_time: "14:00", open: true },
              { meal_name: "Dinner", start_time: "17:00", end_time: "20:00", open: true },
            ];
          }

          // Determine if dining hall is currently open based on EST time and meal hours
          const isCurrentlyOpen = (() => {
            if (!mealHours || mealHours.length === 0) return false;
            
            const openMeals = mealHours.filter((meal) => meal.open);
            if (openMeals.length === 0) return false;

            // Check if any meal is currently open
            return openMeals.some((meal) => {
              if (!meal.start_time || !meal.end_time) return false;
              const [startHour, startMin] = meal.start_time.split(":").map(Number);
              const [endHour, endMin] = meal.end_time.split(":").map(Number);
              const startTime = startHour * 60 + startMin;
              const endTime = endHour * 60 + endMin;
              return currentTime >= startTime && currentTime <= endTime;
            });
          })();

          const formattedHours = formatHours(mealHours);

          return {
            id: index + 1,
            name: location.name,
            type: location.type,
            hours: formattedHours,
            status: (isCurrentlyOpen ? "open" : "closed") as "open" | "closed",
            image: getLocationLogo(location.name, location.type),
            mealHours: mealHours,
          };
        })
      );

      // Section locations by type
      const diningHalls = processedLocations.filter(location => location.type === 0);
      const quickBites = processedLocations.filter(location => location.type === 1);
      const onTheGo = processedLocations.filter(location => location.type === 2);

      setProcessedLocations({ diningHalls, quickBites, onTheGo });
    };

    if (locations.length > 0) {
      processLocations();
    }
  }, [locations]);

  // Use processed locations
  const { diningHalls, quickBites, onTheGo } = processedLocations;

  const fetchDiningHalls = async () => {
    try {
      await refreshLocations();
    } catch (error) {
      console.error("Error refreshing dining halls:", error);
      Alert.alert("Error", "Failed to refresh dining hall data");
    }
  };

  // Pull to refresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshLocations();
    } catch (error) {
      console.error("Error refreshing dining halls:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshLocations]);

  const handleDiningHallPress = (name: string) => {
    router.push(`/dining-hall/${encodeURIComponent(name)}`);
  };

  return (
    <BackgroundTemplate>
      <View className="flex-1">
        {/* Header Section */}
        <View className="bg-transparent pt-14 pb-3 px-6">
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-white text-lg font-sora">Welcome</Text>
              <Text className="text-white text-2xl font-sora-bold">
                {user?.user_metadata?.full_name ? 
                  user.user_metadata.full_name.split(' ')[0] : 
                  'Boilermaker'
                }
              </Text>
            </View>
          </View>
        </View>
        

        {/* Main Content */}
        <ScrollView 
          className="flex-1 px-6"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#CFB991"
              colors={["#CFB991"]}
            />
          }
        >

          {/* Dining Halls Grid */}
          {loading ? (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-white text-lg font-sora">
                Loading dining halls...
              </Text>
            </View>
          ) : error ? (
            <View className="flex-1 justify-center items-center py-8 px-6">
              <Text className="text-purdueBlack-200 text-lg font-sora text-center mb-4">
                Error loading dining halls
              </Text>
              <Text className="text-purdueBlack-200 text-sm font-sora text-center opacity-70 mb-4">
                {error}
              </Text>
              <TouchableOpacity
                onPress={fetchDiningHalls}
                className="bg-purdueGold rounded-lg px-6 py-3"
              >
                <Text className="text-purdueBlack-200 font-sora-bold">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Dining Halls Section */}
              {diningHalls.length > 0 && (
                <View>
                  <Text className="text-white text-2xl font-sora-semibold mb-2">
                    Dining Halls
                  </Text>
                  <View className="flex-row flex-wrap justify-between">
                    {diningHalls.map((hall) => (
                      <View key={hall.id} className="w-[48%]">
                        <DiningHallCard
                          name={hall.name}
                          hours={hall.hours}
                          status={hall.status}
                          image={hall.image}
                          onPress={() => handleDiningHallPress(hall.name)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Quick Bites Section */}
              {quickBites.length > 0 && (
                <View>
                  <Text className="text-white text-2xl font-sora-semibold mb-2 mt-2">
                    Quick Bites
                  </Text>
                  <View className="flex-row flex-wrap justify-between">
                    {quickBites.map((hall) => (
                      <View key={hall.id} className="w-[48%]">
                        <DiningHallCard
                          name={hall.name}
                          hours={hall.hours}
                          status={hall.status}
                          image={hall.image}
                          onPress={() => handleDiningHallPress(hall.name)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* On-The-GO! Section */}
              {onTheGo.length > 0 && (
                <View>
                  <Text className="text-white text-2xl font-sora-semibold mb-2 mt-2">
                    On-The-GO!
                  </Text>
                  <View className="flex-row flex-wrap justify-between">
                    {onTheGo.map((hall) => (
                      <View key={hall.id} className="w-[48%]">
                        <DiningHallCard
                          name={hall.name}
                          hours={hall.hours}
                          status={hall.status}
                          image={hall.image}
                          onPress={() => handleDiningHallPress(hall.name)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}
