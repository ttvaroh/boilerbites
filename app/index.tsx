import { Link } from "expo-router";
import * as React from "react";
import { Button, Text, View } from "react-native";
import { getDining } from "../api";

export default function Index() {
  const [data, setData] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const jsonMealData = await getDining("Ford", today);
      setData(jsonMealData);
    } catch (error: any) {
      setErr(String(error?.message || error));
      setData(null);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  return (
    <View className="flex-1 items-center justify-center">
      <Button title="Reload" onPress={load} />
      <Text className="text-5xl text-themeBlue-200">Hello Tommy!</Text>
      <Link href="/onboarding">Onboarding</Link>
    </View>
  );
}
