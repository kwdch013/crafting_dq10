-- レシピ名を含む参照用ビューの追加
-- 各 *_recipes は name を持たず craft_master に集約する設計 (docs/design/09-recipe-db-schema.md) のため、
-- SQLで直接見たときにどのレシピか分からない。実テーブルは変えず、参照用ビューだけを追加する。
-- is_active によるフィルタはビュー側では行わず、呼び出し側に委ねる。

-- 道具鍛冶のレシピ名付きビュー
CREATE VIEW v_tool_recipes AS
SELECT
	recipe.id,
	master.name,
	master.legacy_id,
	recipe.class,
	recipe.category_id,
	recipe.chara_id,
	master.sort_order,
	master.archived,
	recipe.a_min, recipe.a_max,
	recipe.b_min, recipe.b_max,
	recipe.c_min, recipe.c_max,
	recipe.d_min, recipe.d_max,
	recipe.e_min, recipe.e_max,
	recipe.f_min, recipe.f_max,
	recipe.g_min, recipe.g_max,
	recipe.h_min, recipe.h_max,
	recipe.created_at,
	recipe.updated_at,
	master.is_active AS craft_master_is_active,
	recipe.is_active AS recipe_is_active
FROM tool_recipes AS recipe
JOIN craft_master AS master ON master.id = recipe.id;

-- 武器鍛冶のレシピ名付きビュー
CREATE VIEW v_weapon_recipes AS
SELECT
	recipe.id,
	master.name,
	master.legacy_id,
	recipe.class,
	recipe.category_id,
	recipe.chara_id,
	master.sort_order,
	master.archived,
	recipe.a_min, recipe.a_max,
	recipe.b_min, recipe.b_max,
	recipe.c_min, recipe.c_max,
	recipe.d_min, recipe.d_max,
	recipe.e_min, recipe.e_max,
	recipe.f_min, recipe.f_max,
	recipe.g_min, recipe.g_max,
	recipe.h_min, recipe.h_max,
	recipe.created_at,
	recipe.updated_at,
	master.is_active AS craft_master_is_active,
	recipe.is_active AS recipe_is_active
FROM weapon_recipes AS recipe
JOIN craft_master AS master ON master.id = recipe.id;

-- 防具鍛冶のレシピ名付きビュー
CREATE VIEW v_armor_recipes AS
SELECT
	recipe.id,
	master.name,
	master.legacy_id,
	recipe.class,
	recipe.category_id,
	recipe.chara_id,
	master.sort_order,
	master.archived,
	recipe.a_min, recipe.a_max,
	recipe.b_min, recipe.b_max,
	recipe.c_min, recipe.c_max,
	recipe.d_min, recipe.d_max,
	recipe.e_min, recipe.e_max,
	recipe.f_min, recipe.f_max,
	recipe.g_min, recipe.g_max,
	recipe.h_min, recipe.h_max,
	recipe.created_at,
	recipe.updated_at,
	master.is_active AS craft_master_is_active,
	recipe.is_active AS recipe_is_active
FROM armor_recipes AS recipe
JOIN craft_master AS master ON master.id = recipe.id;

-- 裁縫のレシピ名付きビュー
CREATE VIEW v_sewing_recipes AS
SELECT
	recipe.id,
	master.name,
	master.legacy_id,
	recipe.class,
	recipe.category_id,
	recipe.chara_id,
	master.sort_order,
	master.archived,
	recipe.value_a, recipe.value_b, recipe.value_c,
	recipe.value_d, recipe.value_e, recipe.value_f,
	recipe.value_g, recipe.value_h, recipe.value_i,
	recipe.created_at,
	recipe.updated_at,
	master.is_active AS craft_master_is_active,
	recipe.is_active AS recipe_is_active
FROM sewing_recipes AS recipe
JOIN craft_master AS master ON master.id = recipe.id;

-- 木工のレシピ名付きビュー
CREATE VIEW v_wood_recipes AS
SELECT
	recipe.id,
	master.name,
	master.legacy_id,
	recipe.class,
	recipe.category_id,
	recipe.chara_id,
	master.sort_order,
	master.archived,
	recipe.value_a, recipe.grain_a,
	recipe.value_b, recipe.grain_b,
	recipe.value_c, recipe.grain_c,
	recipe.value_d, recipe.grain_d,
	recipe.value_e, recipe.grain_e,
	recipe.value_f, recipe.grain_f,
	recipe.value_g, recipe.grain_g,
	recipe.value_h, recipe.grain_h,
	recipe.value_i, recipe.grain_i,
	recipe.created_at,
	recipe.updated_at,
	master.is_active AS craft_master_is_active,
	recipe.is_active AS recipe_is_active
FROM wood_recipes AS recipe
JOIN craft_master AS master ON master.id = recipe.id;

-- 調理のレシピ名付きビュー
CREATE VIEW v_cooking_recipes AS
SELECT
	recipe.id,
	master.name,
	master.legacy_id,
	recipe.class,
	recipe.category_id,
	recipe.chara_id,
	master.sort_order,
	master.archived,
	recipe.material_a, recipe.group_a, recipe.a_min,
	recipe.material_b, recipe.group_b, recipe.b_min,
	recipe.material_c, recipe.group_c, recipe.c_min,
	recipe.material_d, recipe.group_d, recipe.d_min,
	recipe.material_e, recipe.group_e, recipe.e_min,
	recipe.material_f, recipe.group_f, recipe.f_min,
	recipe.material_g, recipe.group_g, recipe.g_min,
	recipe.material_h, recipe.group_h, recipe.h_min,
	recipe.material_i, recipe.group_i, recipe.i_min,
	recipe.created_at,
	recipe.updated_at,
	master.is_active AS craft_master_is_active,
	recipe.is_active AS recipe_is_active
FROM cooking_recipes AS recipe
JOIN craft_master AS master ON master.id = recipe.id;
