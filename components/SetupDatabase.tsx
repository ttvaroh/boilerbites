import { updateTodaysMenu } from "@/lib/supabase-setup/db-setup";
import React from "react";
import { Alert, Text, TouchableOpacity } from "react-native";

export default function SetupDatabase(props: any) {
  const handlePress = async () => {
    try {
      await updateTodaysMenu();
      Alert.alert("Success", "Database setup completed!");
      // Refresh the dining halls data
      props.fetchDiningHalls();
    } catch (error) {
      Alert.alert("Error", "Database setup failed");
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-blue-500 p-4 rounded-lg mb-4"
    >
      <Text className="text-white text-center font-sora-bold">
        Setup Database
      </Text>
    </TouchableOpacity>
  );
}
