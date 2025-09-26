import React from 'react'
import { Text, View } from 'react-native'

const DailyProgress = () => {
  return (
    <View className="bg-gradient-to-r from-purdueGold/20 to-purdueGold/10 rounded-2xl p-6 border border-purdueGold/30">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-white">Today's Progress</Text>
        <Text className="text-sm text-gray-400">Oct 24, 2024</Text>
      </View>
      
      <View className="flex-row justify-between mb-6">
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-purdueGold">1,847</Text>
          <Text className="text-xs text-gray-400">Consumed</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-white">453</Text>
          <Text className="text-xs text-gray-400">Remaining</Text>
        </View>
      </View>
      
      <View className="w-full bg-gray-700 rounded-full h-3 mb-2">
        <View className="bg-purdueGold h-3 rounded-full w-4/5" />
      </View>
      <Text className="text-xs text-center text-gray-400">Goal: 2,300 calories</Text>
    </View>
  )
}

export default DailyProgress