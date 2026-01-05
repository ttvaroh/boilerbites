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
import MenuItemCard from "../../components/MenuItemCard";
import {
  Collection as CollectionType,
  createItemFromCollection,
  findCollectionDerivedItem
} from "../../lib/collectionUtils";
import { COLLECTION_DERIVED_USER_ID } from "../../lib/constants";
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

export default function CollectionPage() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

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
        const items: CollectionItem[] = (collectionItems || []).map((ci: any) => ({
          id: ci.item.id,
          name: ci.item.name,
          vegetarian: ci.item.vegetarian,
          vegan: ci.item.vegan,
          gluten: ci.item.gluten,
          allergens: ci.item.allergens,
          serving_size: ci.item.serving_size,
          calories: ci.item.calories,
          protein_g: ci.item.protein_g,
          carbs_g: ci.item.carbs_g,
          fat_g: ci.item.fat_g,
          fiber_g: ci.item.fiber_g,
          sugar_g: ci.item.sugar_g,
          sodium_mg: ci.item.sodium_mg,
          last_verified: ci.item.last_verified,
          ingredients: ci.item.ingredients,
        })).sort((a: CollectionItem, b: CollectionItem) => a.name.localeCompare(b.name));

        setCollection({
          id: collectionData.id,
          name: collectionData.name,
          items: items
        } as CollectionType);

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

  const handleAddCollectionAsItem = async () => {
    if (!collection || processing) return;

    console.log('🔵 [Collection] Starting add collection as item process');
    console.log('🔵 [Collection] Collection ID:', collection.id);
    console.log('🔵 [Collection] Collection Name:', collection.name);
    console.log('🔵 [Collection] Collection Items Count:', collection.items.length);

    // Check if collection has items
    if (collection.items.length === 0) {
      Alert.alert(
        "Empty Collection",
        "This collection has no items. Please add items to the collection before creating a custom item.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setProcessing(true);

      // Check if item already exists
      const existingItemId = await findCollectionDerivedItem(
        collection.id,
        collection.name
      );

      if (existingItemId) {
        // Verify the item exists before navigating
        const { data: existingItem } = await supabase
          .from('item')
          .select('id, name, user_id')
          .eq('id', existingItemId)
          .maybeSingle();

        if (existingItem) {
          router.push(`/nutrition/${existingItemId}`);
          return;
        }
      }

      // Create new item from collection
      const newItemId = await createItemFromCollection(collection);

      if (!newItemId) {
        Alert.alert(
          "Error",
          "Failed to create item from collection. Please try again.",
          [{ text: "OK" }]
        );
        return;
      }

      // Verify the item was created and exists in the database
      // Query by both ID and name+user_id to be more reliable
      // Retry a few times in case of database replication delay
      let verifiedItemId: string | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        // Try querying by ID first
        const { data: itemById } = await supabase
          .from('item')
          .select('id, name, user_id, ingredients')
          .eq('id', newItemId)
          .maybeSingle();

        if (itemById) {
          verifiedItemId = newItemId;
          break;
        }

        // If not found by ID, try querying by name, preset user_id, and is_collection=false (more reliable)
        // IMPORTANT: Exclude collection items (is_collection: true) - we only want derived items
        const { data: itemByName } = await supabase
          .from('item')
          .select('id, name, user_id, ingredients, is_collection')
          .eq('name', collection.name)
          .eq('user_id', COLLECTION_DERIVED_USER_ID) // Preset global user_id
          .eq('is_collection', false) // Exclude actual collections - only find derived items
          .maybeSingle();

        if (itemByName) {
          verifiedItemId = itemByName.id;
          break;
        }

        // Wait a bit before retrying (exponential backoff)
        if (attempt < 4) {
          const delay = 300 * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (!verifiedItemId) {
        // Even if verification fails, try navigating - the item might exist but not be queryable yet
        // The nutrition page will handle the error gracefully
        router.push(`/nutrition/${newItemId}`);
        return;
      }

      // Navigate to verified item's nutrition page
      router.push(`/nutrition/${verifiedItemId}`);
    } catch (error) {
      Alert.alert(
        "Error",
        "An error occurred while creating the item. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setProcessing(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <BackgroundTemplate paddingBottom={0}>
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
      <BackgroundTemplate paddingBottom={0}>
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
      <BackgroundTemplate paddingBottom={0}>
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
    <BackgroundTemplate paddingBottom={0}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-transparent pt-14 pb-2 px-6">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center pb-2"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text className="text-white text-lg font-sora ml-2">Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAddCollectionAsItem}
              disabled={processing || collection.items.length === 0}
              className="bg-purdueGold rounded-lg px-4 py-2"
              style={{
                opacity: processing || collection.items.length === 0 ? 0.5 : 1,
                shadowColor: "#CFB991",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-purdueBlack-200 text-sm font-sora-bold">
                {processing ? "Processing..." : "Add Collection as Item"}
              </Text>
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
