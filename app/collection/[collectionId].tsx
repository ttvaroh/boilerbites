import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "../../components/BackgroundTemplate";
import MenuItemCard from "../../components/MenuItemCard";
import { supabase } from "../../lib/supabase";

interface CollectionItem {
  id: string;
  name: string;
  vegetarian?: boolean;
  vegan?: boolean;
  gluten?: boolean;
  allergens?: string[];
  serving_size?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  last_verified?: string;
  ingredients?: string;
}

interface Collection {
  id: string;
  name: string;
  items: CollectionItem[];
}

export default function CollectionPage() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch collection data
  useEffect(() => {
    const fetchCollection = async () => {
      if (!collectionId) return;

      try {
        setLoading(true);
        setError(null);

        // First, get the collection item details
        const { data: collectionData, error: collectionError } = await supabase
          .from('item')
          .select('*')
          .eq('id', collectionId)
          .eq('is_collection', true)
          .single();

        if (collectionError || !collectionData) {
          setError("Collection not found");
          return;
        }

        // Get all items in this collection
        const { data: collectionItems, error: itemsError } = await supabase
          .from('collection_item')
          .select(`
            item_id,
            item:item_id (
              id,
              name,
              vegetarian,
              vegan,
              gluten,
              allergens,
              serving_size,
              calories,
              protein_g,
              carbs_g,
              fat_g,
              fiber_g,
              sugar_g,
              sodium_mg,
              last_verified,
              ingredients
            )
          `)
          .eq('collection_id', collectionId);

        if (itemsError) {
          console.error('Error fetching collection items:', itemsError);
          setError("Failed to load collection items");
          return;
        }

        // Transform the data to match our interface and sort by name
        const items: CollectionItem[] = (collectionItems || []).map(ci => ({
          id: ci.item[0].id,
          name: ci.item[0].name,
          vegetarian: ci.item[0].vegetarian,
          vegan: ci.item[0].vegan,
          gluten: ci.item[0].gluten,
          allergens: ci.item[0].allergens,
          serving_size: ci.item[0].serving_size,
          calories: ci.item[0].calories,
          protein_g: ci.item[0].protein_g,
          carbs_g: ci.item[0].carbs_g,
          fat_g: ci.item[0].fat_g,
          fiber_g: ci.item[0].fiber_g,
          sugar_g: ci.item[0].sugar_g,
          sodium_mg: ci.item[0].sodium_mg,
          last_verified: ci.item[0].last_verified,
          ingredients: ci.item[0].ingredients,
        })).sort((a, b) => a.name.localeCompare(b.name));

        setCollection({
          id: collectionData.id,
          name: collectionData.name,
          items: items
        });

      } catch (error) {
        console.error('Error fetching collection:', error);
        setError("Failed to load collection");
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [collectionId]);

  const handleMenuItemPress = (item: CollectionItem) => {
    // Navigate to nutrition page if serving size exists, otherwise to missing nutrition page
    if (item.serving_size) {
      router.push(`/nutrition/${item.id}`);
    } else {
      router.push(`/missing-nutrition/${item.id}`);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <BackgroundTemplate>
        <View className="flex-1">
          <View className="bg-purdueBlack-200 pt-12 pb-6 px-6">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text className="text-white text-lg font-sora ml-2">Back</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg font-sora">
              Loading collection...
            </Text>
          </View>
        </View>
      </BackgroundTemplate>
    );
  }

  // Show error state
  if (error) {
    return (
      <BackgroundTemplate>
        <View className="flex-1">
          <View className="bg-purdueBlack-200 pt-12 pb-6 px-6">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text className="text-white text-lg font-sora ml-2">Back</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-white text-lg font-sora text-center mb-4">
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-purdueGold rounded-lg px-6 py-3"
            >
              <Text className="text-black text-base font-sora-bold">
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BackgroundTemplate>
    );
  }

  // Show no collection state
  if (!collection) {
    return (
      <BackgroundTemplate>
        <View className="flex-1">
          <View className="bg-purdueBlack-200 pt-12 pb-6 px-6">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text className="text-white text-lg font-sora ml-2">Back</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg font-sora text-center">
              Collection not found.
            </Text>
          </View>
        </View>
      </BackgroundTemplate>
    );
  }

  return (
    <BackgroundTemplate>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-transparent pt-14 pb-2 px-6">
          <View className="flex-row items-center justify-between mb-0">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center pb-2"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text className="text-white text-lg font-sora ml-2">Back</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-white text-3xl font-sora-bold mb-2">{collection.name}</Text>
          <Text className="text-gray-300 text-base font-sora mb-0">
            {collection.items.length} item{collection.items.length !== 1 ? 's' : ''} in this collection
          </Text>
        </View>

        {/* Main Content */}
        <ScrollView className="flex-1 px-6">
          {/* Collection Items */}
          <View className="py-4">
            <Text className="text-white text-lg font-sora-bold mb-2">
              Items
            </Text>

          {collection.items.length === 0 ? (
            <View className="bg-gray-800 rounded-xl p-6 mt-4 mb-2 shadow-lg"
              style={{
                shadowColor: "#CFB991",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
                borderWidth: 1,
                borderColor: "rgba(207, 185, 145, 0.2)",
              }}
            >
              <Text className="text-gray-300 text-base font-sora text-center">
                This collection is empty.
              </Text>
            </View>
          ) : (
            collection.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleMenuItemPress(item)}
                className="mb-0"
              >
                <MenuItemCard item={item} />
              </TouchableOpacity>
            ))
          )}
          </View>
        </ScrollView>
      </View>
    </BackgroundTemplate>
  );
}
