import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import CustomFoodForm from "../../components/CustomFoodForm";
import { useToast } from "../../contexts/ToastContext";
import { editCustomItem, removeCustomFood } from "../../lib/api";
import { supabase } from "../../lib/supabase";

export default function EditCustomFoodPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();

  // Form state (primary)
  const [name, setName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");

  // Form state (advanced)
  const [fiberG, setFiberG] = useState("");
  const [sugarG, setSugarG] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [vegetarian, setVegetarian] = useState(false);
  const [vegan, setVegan] = useState(false);
  const [gluten, setGluten] = useState(false);
  const [allergens, setAllergens] = useState(""); // comma-separated
  const [ingredients, setIngredients] = useState("");
  const [proteinPer100Cals, setProteinPer100Cals] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing item data
  useEffect(() => {
    if (itemId) {
      loadItemData();
    }
  }, [itemId]);

  const loadItemData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("item")
        .select("*")
        .eq("id", itemId)
        .single();

      if (error) {
        Alert.alert("Error", "Failed to load item data");
        router.back();
        return;
      }

      if (data) {
        setName(data.name || "");
        setServingSize(data.serving_size || "");
        setCalories(data.calories?.toString() || "");
        setProteinG(data.protein_g?.toString() || "");
        setCarbsG(data.carbs_g?.toString() || "");
        setFatG(data.fat_g?.toString() || "");
        setFiberG(data.fiber_g?.toString() || "");
        setSugarG(data.sugar_g?.toString() || "");
        setSodiumMg(data.sodium_mg?.toString() || "");
        setVegetarian(data.vegetarian || false);
        setVegan(data.vegan || false);
        setGluten(data.gluten || false);
        setAllergens(data.allergens?.join(", ") || "");
        setIngredients(data.ingredients || "");
        setProteinPer100Cals(data.protein_per_100cals?.toString() || "");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load item data");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      showToast("Item name is required", "error");
      return;
    }

    if (!itemId) {
      showToast("Item ID is missing", "error");
      return;
    }

    try {
      setSubmitting(true);

      const result = await editCustomItem({
        item_id: itemId,
        name: name.trim(),
        serving_size: servingSize.trim() || undefined,
        calories: calories ? parseFloat(calories) : undefined,
        protein_g: proteinG ? parseFloat(proteinG) : undefined,
        carbs_g: carbsG ? parseFloat(carbsG) : undefined,
        fat_g: fatG ? parseFloat(fatG) : undefined,
        fiber_g: fiberG ? parseFloat(fiberG) : undefined,
        sugar_g: sugarG ? parseFloat(sugarG) : undefined,
        sodium_mg: sodiumMg ? parseFloat(sodiumMg) : undefined,
        vegetarian: vegetarian,
        vegan: vegan,
        gluten: gluten,
        allergens: allergens.trim() ? allergens.split(",").map(a => a.trim()).filter(a => a) : undefined,
        ingredients: ingredients.trim() || undefined,
      });

      if (result.success) {
        router.back();
        showToast("Item updated successfully!", "success");
      } else {
        showToast(result.error || "Failed to update item", "error");
      }
    } catch (error) {
      showToast("Failed to update item", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemId) {
      showToast("Item ID is missing", "error");
      return;
    }

    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this custom food item? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);
              const result = await removeCustomFood(itemId);

              if (result.success) {
                router.back();
                showToast("Item deleted successfully!", "success");
              } else {
                showToast(result.error || "Failed to delete item", "error");
              }
            } catch (error) {
              showToast("Failed to delete item", "error");
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <BackgroundTemplate>
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg">Loading...</Text>
        </View>
      </BackgroundTemplate>
    );
  }

  return (
    <BackgroundTemplate>
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between py-14 px-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text className="text-white text-lg ml-2 font-sora">Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-sora-bold">Edit Custom Food</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Edit Form */}
        <View className="px-4 pb-8">
          <CustomFoodForm
            name={name}
            servingSize={servingSize}
            calories={calories}
            proteinG={proteinG}
            carbsG={carbsG}
            fatG={fatG}
            fiberG={fiberG}
            sugarG={sugarG}
            sodiumMg={sodiumMg}
            vegetarian={vegetarian}
            vegan={vegan}
            gluten={gluten}
            allergens={allergens}
            ingredients={ingredients}
            setName={setName}
            setServingSize={setServingSize}
            setCalories={setCalories}
            setProteinG={setProteinG}
            setCarbsG={setCarbsG}
            setFatG={setFatG}
            setFiberG={setFiberG}
            setSugarG={setSugarG}
            setSodiumMg={setSodiumMg}
            setVegetarian={setVegetarian}
            setVegan={setVegan}
            setGluten={setGluten}
            setAllergens={setAllergens}
            setIngredients={setIngredients}
            onSubmit={handleUpdate}
            onDelete={handleDelete}
            submitting={submitting}
            submitButtonText="Update"
            deleteButtonText="Delete"
            showDeleteButton={true}
          />
        </View>
      </ScrollView>

    </BackgroundTemplate>
  );
}
