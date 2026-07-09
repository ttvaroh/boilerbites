import { ITEM_SELECT_COLUMNS_WITH_INGREDIENTS } from "./itemSelectColumns";
import { supabase } from "./supabase";

const PURDUE_GRAPHQL_URL = "https://api.hfs.purdue.edu/menus/v3/GraphQL";

const PURDUE_GRAPHQL_HEADERS = {
  "Content-Type": "application/json",
  Origin: "https://dining.purdue.edu",
  Referer: "https://dining.purdue.edu/",
};

type RpcResult = {
  success: boolean;
  error?: string;
  item_id?: string;
  message?: string;
};

export interface MenuItem {
  id: string;
  name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  serving_size?: string;
  vegetarian?: boolean;
  vegan?: boolean;
  gluten?: boolean;
  allergens?: string[];
  ingredients?: string;
  is_collection?: boolean;
}

export interface MealItem {
  item: MenuItem;
  quantity: number;
}

export interface ItemAppearance {
  date: string;
  locationName: string;
  mealName: string;
  stationName?: string;
}

export interface CustomFoodInput {
  name: string;
  serving_size?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  vegetarian?: boolean;
  vegan?: boolean;
  gluten?: boolean;
  allergens?: string[];
  ingredients?: string;
}

export interface EditCustomItemInput {
  item_id: string;
  name?: string;
  serving_size?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  vegetarian?: boolean;
  vegan?: boolean;
  gluten?: boolean;
  allergens?: string[];
  ingredients?: string;
}

interface CustomMealItemRow {
  item_id: string;
  quantity: number | null;
  item: MenuItem | MenuItem[] | null;
}

async function callRpc(
  fn: string,
  args: Record<string, unknown>,
): Promise<RpcResult> {
  const { data, error } = await supabase.rpc(fn, args);

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && typeof data === "object") {
    return data as RpcResult;
  }

  return { success: false, error: "Unexpected RPC response" };
}

export async function createCustomMeal(
  name: string,
  userId: string,
): Promise<RpcResult> {
  return callRpc("create_custom_meal", {
    p_name: name,
    p_created_by: userId,
  });
}

export async function addItemToCustomMeal(
  mealId: string,
  itemId: string,
  quantity: number,
): Promise<RpcResult> {
  return callRpc("add_item_to_custom_meal", {
    p_meal_id: mealId,
    p_item_id: itemId,
    p_quantity: quantity,
  });
}

export async function removeItemFromCustomMeal(
  mealId: string,
  itemId: string,
): Promise<RpcResult> {
  return callRpc("remove_item_from_custom_meal", {
    p_meal_id: mealId,
    p_item_id: itemId,
  });
}

export async function updateMealItemQuantity(
  mealId: string,
  itemId: string,
  quantity: number,
): Promise<RpcResult> {
  return callRpc("update_custom_meal_item_quantity", {
    p_meal_id: mealId,
    p_item_id: itemId,
    p_quantity: quantity,
  });
}

export async function deleteCustomMeal(mealId: string): Promise<RpcResult> {
  return callRpc("delete_custom_meal", { p_meal_id: mealId });
}

export async function getCustomMealItems(mealId: string): Promise<{
  data: Array<{ item_id: string; quantity: number; item: MenuItem }> | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("collection_item")
    .select(
      `
      item_id,
      quantity,
      item:item_id (${ITEM_SELECT_COLUMNS_WITH_INGREDIENTS})
    `,
    )
    .eq("collection_id", mealId);

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const rows = (data ?? []) as CustomMealItemRow[];
  return {
    data: rows
      .map((row) => {
        const item = Array.isArray(row.item) ? row.item[0] : row.item;
        if (!item) return null;
        return {
          item_id: row.item_id,
          quantity: row.quantity ?? 1,
          item,
        };
      })
      .filter(
        (row): row is { item_id: string; quantity: number; item: MenuItem } =>
          row !== null,
      ),
    error: null,
  };
}

export async function createAndAddCustomFood(
  input: CustomFoodInput,
  userId?: string | null,
): Promise<RpcResult> {
  return callRpc("create_and_add_custom_food", {
    p_name: input.name,
    p_serving_size: input.serving_size ?? null,
    p_calories: input.calories ?? null,
    p_protein_g: input.protein_g ?? null,
    p_carbs_g: input.carbs_g ?? null,
    p_fat_g: input.fat_g ?? null,
    p_fiber_g: input.fiber_g ?? null,
    p_sugar_g: input.sugar_g ?? null,
    p_sodium_mg: input.sodium_mg ?? null,
    p_vegetarian: input.vegetarian ?? null,
    p_vegan: input.vegan ?? null,
    p_gluten: input.gluten ?? null,
    p_allergens: input.allergens ?? null,
    p_ingredients: input.ingredients ?? null,
    p_created_by: userId ?? null,
    p_user_id: userId ?? null,
  });
}

export async function editCustomItem(
  input: EditCustomItemInput,
): Promise<RpcResult> {
  return callRpc("edit_custom_item", {
    p_item_id: input.item_id,
    p_name: input.name ?? null,
    p_serving_size: input.serving_size ?? null,
    p_calories: input.calories ?? null,
    p_protein_g: input.protein_g ?? null,
    p_carbs_g: input.carbs_g ?? null,
    p_fat_g: input.fat_g ?? null,
    p_fiber_g: input.fiber_g ?? null,
    p_sugar_g: input.sugar_g ?? null,
    p_sodium_mg: input.sodium_mg ?? null,
    p_vegetarian: input.vegetarian ?? null,
    p_vegan: input.vegan ?? null,
    p_gluten: input.gluten ?? null,
    p_allergens: input.allergens ?? null,
    p_ingredients: input.ingredients ?? null,
  });
}

export async function removeCustomFood(itemId: string): Promise<RpcResult> {
  return callRpc("remove_custom_food", { p_item_id: itemId });
}

const ITEM_APPEARANCES_QUERY = `query getItemAppearances($id: Guid!) {
  itemByItemId(itemId: $id) {
    appearances {
      date
      locationName
      mealName
      stationName
    }
  }
}`;

export async function getItemAppearances(
  itemId: string,
): Promise<ItemAppearance[] | null> {
  try {
    const response = await fetch(PURDUE_GRAPHQL_URL, {
      method: "POST",
      headers: PURDUE_GRAPHQL_HEADERS,
      body: JSON.stringify({
        query: ITEM_APPEARANCES_QUERY,
        variables: { id: itemId },
      }),
    });

    if (!response.ok) {
      console.error(
        "[getItemAppearances] HTTP error:",
        response.status,
        itemId,
      );
      return null;
    }

    const result = await response.json();

    if (result.errors) {
      console.error("[getItemAppearances] GraphQL errors:", result.errors);
      return null;
    }

    return result.data?.itemByItemId?.appearances ?? [];
  } catch (error) {
    console.error("[getItemAppearances] Request failed:", error);
    return null;
  }
}
