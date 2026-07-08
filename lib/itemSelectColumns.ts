/** Shared PostgREST column list for item reads (excludes ingredients). */
export const ITEM_SELECT_COLUMNS =
  "id,name,vegetarian,vegan,gluten,allergens,serving_size,calories,protein_g,carbs_g,fat_g,fiber_g,sugar_g,sodium_mg,protein_per_100cals,last_verified,is_collection,user_id,source";

export const ITEM_SELECT_COLUMNS_WITH_INGREDIENTS =
  `${ITEM_SELECT_COLUMNS},ingredients`;

export const NESTED_MENU_ITEM_SELECT = `
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
  protein_per_100cals,
  last_verified,
  is_collection,
  user_id
`;

export const HEALTH_CONNECTION_SELECT_COLUMNS =
  "id,user_id,app_type,external_user_id,access_token,refresh_token,token_expires_at,healthkit_enabled,auto_sync_enabled,sync_direction,last_sync_at,last_sync_status,last_sync_error,scope,enabled,created_at,updated_at";
