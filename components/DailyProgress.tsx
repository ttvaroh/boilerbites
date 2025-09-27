import { Text, View } from 'react-native';

const DailyProgress = () => {
  // Macronutrient data
  const proteinData = { current: 89, goal: 115, color: '#3B82F6' };
  const carbsData = { current: 156, goal: 288, color: '#10B981' };
  const fatData = { current: 47, goal: 77, color: '#EF4444' };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const MacroBar = ({ data, label }: { data: { current: number; goal: number; color: string }; label: string }) => {
    const percentage = getProgressPercentage(data.current, data.goal);
    
    return (
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View 
            className="w-3 h-3 rounded-full mr-3" 
            style={{ backgroundColor: data.color }}
          />
          <Text className="text-white text-sm font-sora flex-1">{label}</Text>
        </View>
        <View className="flex-1 ml-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-gray-400 text-xs font-sora">
              {data.current}g / {data.goal}g
            </Text>
          </View>
          <View className="w-full bg-gray-700 rounded-full h-2">
            <View 
              className="h-2 rounded-full" 
              style={{ 
                backgroundColor: data.color,
                width: `${percentage}%`
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="bg-gray-800 rounded-xl p-6 mb-6" style={{
      shadowColor: "#CFB991",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      borderWidth: 1,
      borderColor: "rgba(207, 185, 145, 0.2)",
    }}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-sora-semibold text-white">Today's Progress</Text>
        <Text className="text-sm text-gray-400">Oct 24, 2024</Text>
      </View>
      
      <View className="flex-row justify-between mb-6">
        <View className="flex-1 items-center">
          <Text className="text-2xl font-sora-bold text-purdueGold">1,847</Text>
          <Text className="text-xs text-gray-400">Consumed</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-sora-bold text-white">453</Text>
          <Text className="text-xs text-gray-400">Remaining</Text>
        </View>
      </View>
      
      <View className="w-full bg-gray-700 rounded-full h-3 mb-2">
        <View className="bg-purdueGold h-3 rounded-full w-4/5" />
      </View>
      <Text className="text-xs text-center text-gray-400 mb-6">Goal: 2,300 calories</Text>

      {/* Macronutrient Breakdown */}
      <View>
        <MacroBar data={proteinData} label="Protein" />
        <MacroBar data={carbsData} label="Carbs" />
        <MacroBar data={fatData} label="Fat" />
      </View>
    </View>
  )
}

export default DailyProgress