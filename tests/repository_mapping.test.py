"""列展開の行と現行JSONの items 配列を相互変換する関数のテスト

DB接続を必要としないため、CI でもそのまま実行します。
変換規則は docs/design/12-recipe-db-conversion.md を参照します。
"""

import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

from repository import mapping
from repository.mapping import common, cooking, sewing, smithing, wood

# 調理の食材マスタ (0003_seed_master.sql と同じ内容の抜粋)
MATERIALS = {
	1: {"material_name": "肉", "pair_direction": "horizontal"},
	2: {"material_name": "魚", "pair_direction": "vertical"},
	3: {"material_name": "野菜", "pair_direction": None},
}


class CommonTest(unittest.TestCase):
	"""マス名と座標、見出しの組み立て"""

	def test_cell_and_coordinate_are_mutually_convertible(self):
		for name, row, column in [("A", 1, 1), ("E", 2, 2), ("I", 3, 3), ("F", 2, 3)]:
			self.assertEqual(common.coordinate_of_cell(name), {"row": row, "column": column})
			self.assertEqual(common.cell_of_coordinate(row, column), name)

	def test_build_recipe_omits_absent_headers(self):
		recipe = common.build_recipe(
			{"legacy_id": "tool-2x2", "name": "道具 2×2テンプレート"}, []
		)
		self.assertEqual(recipe, {"id": "tool-2x2", "name": "道具 2×2テンプレート", "items": []})

	def test_build_recipe_keeps_category_trait_and_archived(self):
		recipe = common.build_recipe(
			{
				"legacy_id": "cooking-003",
				"name": "かいしんバーガー",
				"category": "肉料理",
				"category_legacy_id": "meat-dishes",
				"trait_id": "light",
				"archived": True,
			},
			[],
		)
		self.assertEqual(list(recipe), ["id", "name", "category", "categoryId", "items", "traitId", "archived"])
		self.assertEqual(recipe["categoryId"], "meat-dishes")
		self.assertTrue(recipe["archived"])

	def test_build_recipe_drops_category_without_legacy_id(self):
		"""鍛冶のテンプレート分類は座標を持たせるためだけの行なので出力しません。"""
		recipe = common.build_recipe(
			{
				"legacy_id": "tool-2x2",
				"name": "道具 2×2テンプレート",
				"category": "テンプレート (2×2)",
				"category_legacy_id": None,
			},
			[],
		)
		self.assertNotIn("category", recipe)
		self.assertNotIn("categoryId", recipe)


class SmithingTest(unittest.TestCase):
	"""鍛冶3職人。座標は分類テーブルが持ちます。"""

	# 超鍛冶ハンマー相当の抜粋 (ハンマー分類: A(1,1) B(1,2) C(2,1))
	COORDINATES = {"row_a": 1, "col_a": 1, "row_b": 1, "col_b": 2, "row_c": 2, "col_c": 1}
	COLUMNS = {"a_min": 130, "a_max": 140, "b_min": 105, "b_max": 111, "c_min": 105, "c_max": 113}

	def test_to_items_restores_coordinates_and_target(self):
		items = smithing.to_items(self.COLUMNS, self.COORDINATES)
		self.assertEqual([item["id"] for item in items], ["part-1", "part-2", "part-3"])
		self.assertEqual([item["name"] for item in items], ["A", "B", "C"])
		self.assertEqual(items[0]["gridCell"], {"row": 1, "column": 1})
		# 基準値は ceil((下限 + 上限) / 2)
		self.assertEqual(items[0]["target"], 135)
		self.assertEqual(items[1]["target"], 108)
		self.assertEqual(items[2]["target"], 109)
		self.assertEqual(items[0]["current"], 0)

	def test_to_items_orders_by_reading_order(self):
		"""列の並びではなく、座標の読み順 (行→列) で採番します。"""
		coordinates = {"row_a": 2, "col_a": 1, "row_b": 1, "col_b": 1}
		columns = {"a_min": 10, "a_max": 20, "b_min": 30, "b_max": 40}
		items = smithing.to_items(columns, coordinates)
		self.assertEqual([item["name"] for item in items], ["B", "A"])
		self.assertEqual([item["id"] for item in items], ["part-1", "part-2"])

	def test_to_columns_fills_unused_cells_with_none(self):
		items = smithing.to_items(self.COLUMNS, self.COORDINATES)
		columns = smithing.to_columns(items)
		self.assertEqual(columns["a_min"], 130)
		self.assertEqual(columns["c_max"], 113)
		self.assertIsNone(columns["d_min"])
		self.assertIsNone(columns["h_max"])

	def test_to_coordinates_extracts_category_cells(self):
		items = smithing.to_items(self.COLUMNS, self.COORDINATES)
		coordinates = smithing.to_coordinates(items)
		self.assertEqual(coordinates["row_b"], 1)
		self.assertEqual(coordinates["col_b"], 2)
		self.assertIsNone(coordinates["row_d"])
		self.assertIsNone(coordinates["col_d"])


class SewingTest(unittest.TestCase):
	"""裁縫。マス名が3行3列の座標順に固定対応します。"""

	COLUMNS = {"value_b": 78, "value_d": 78, "value_e": 80}

	def test_to_items_uses_value_for_all_thresholds(self):
		items = sewing.to_items(self.COLUMNS)
		self.assertEqual([item["name"] for item in items], ["B", "D", "E"])
		self.assertEqual(items[0]["gridCell"], {"row": 1, "column": 2})
		self.assertEqual((items[2]["target"], items[2]["successMin"], items[2]["successMax"]), (80, 80, 80))

	def test_to_columns_round_trips(self):
		self.assertEqual(sewing.to_columns(sewing.to_items(self.COLUMNS))["value_e"], 80)
		self.assertIsNone(sewing.to_columns(sewing.to_items(self.COLUMNS))["value_a"])

	def test_to_cell_flags_marks_used_cells(self):
		flags = sewing.to_cell_flags(sewing.to_items(self.COLUMNS))
		self.assertTrue(flags["exist_b"])
		self.assertFalse(flags["exist_a"])


class WoodTest(unittest.TestCase):
	"""木工。木目はマス単位で持ちます。"""

	COLUMNS = {"value_b": 74, "grain_b": False, "value_e": 74, "grain_e": True}

	def test_to_items_converts_grain_to_option_id(self):
		items = wood.to_items(self.COLUMNS)
		self.assertEqual(items[0]["optionId"], "horizontal")
		self.assertEqual(items[1]["optionId"], "vertical")
		self.assertEqual(list(items[0]), ["id", "name", "optionId", "gridCell", "current", "target", "successMin", "successMax"])

	def test_to_columns_converts_option_id_to_grain(self):
		columns = wood.to_columns(wood.to_items(self.COLUMNS))
		self.assertFalse(columns["grain_b"])
		self.assertTrue(columns["grain_e"])
		self.assertIsNone(columns["grain_a"])
		self.assertIsNone(columns["value_a"])


class CookingTest(unittest.TestCase):
	"""調理。上限は下限 + 30、基準値は下限 + 15 で算出します。"""

	# バトルステーキ相当の抜粋。B と C が同じ肉グループ、F は1マスの野菜、G は食材なし
	COLUMNS = {
		"b_min": 135, "material_b": 1, "group_b": 1,
		"c_min": 135, "material_c": 1, "group_c": 1,
		"f_min": 160, "material_f": 3, "group_f": None,
		"g_min": 135, "material_g": None, "group_g": None,
	}

	def test_to_items_derives_thresholds_and_option_id(self):
		items = cooking.to_items(self.COLUMNS, MATERIALS)
		first = items[0]
		self.assertEqual(first["name"], "B")
		self.assertEqual((first["target"], first["successMin"], first["successMax"]), (150, 135, 165))
		self.assertEqual(first["optionId"], "cross")
		self.assertEqual(items[-1]["optionId"], "corner")

	def test_to_items_numbers_ingredient_groups_in_order(self):
		items = cooking.to_items(self.COLUMNS, MATERIALS)
		by_name = {item["name"]: item for item in items}
		self.assertEqual(by_name["B"]["ingredientGroupId"], "group-1")
		self.assertEqual(by_name["C"]["ingredientGroupId"], "group-1")
		self.assertEqual(by_name["B"]["ingredientSize"], 2)
		self.assertEqual(by_name["B"]["ingredientGroupLabel"], "肉")

	def test_to_items_omits_group_keys_for_single_cell_material(self):
		items = cooking.to_items(self.COLUMNS, MATERIALS)
		by_name = {item["name"]: item for item in items}
		self.assertEqual(by_name["F"]["ingredientGroupLabel"], "野菜")
		self.assertNotIn("ingredientGroupId", by_name["F"])
		self.assertNotIn("ingredientSize", by_name["F"])
		self.assertNotIn("ingredientGroupLabel", by_name["G"])

	def test_to_columns_round_trips_materials_and_groups(self):
		items = cooking.to_items(self.COLUMNS, MATERIALS)
		columns = cooking.to_columns(items, {"肉": 1, "魚": 2, "野菜": 3})
		self.assertEqual(columns["b_min"], 135)
		self.assertEqual(columns["material_b"], 1)
		self.assertEqual(columns["group_b"], 1)
		self.assertEqual(columns["group_c"], 1)
		self.assertIsNone(columns["group_f"])
		self.assertIsNone(columns["material_g"])
		self.assertEqual(columns["g_min"], 135)
		self.assertIsNone(columns["a_min"])

	def test_to_columns_separates_groups_of_the_same_material(self):
		"""同一レシピに同じ食材のグループが複数ある場合は番号で区別します。"""
		items = [
			{"name": "B", "gridCell": {"row": 1, "column": 2}, "successMin": 135,
			 "ingredientGroupId": "top", "ingredientGroupLabel": "肉", "ingredientSize": 2},
			{"name": "C", "gridCell": {"row": 1, "column": 3}, "successMin": 135,
			 "ingredientGroupId": "top", "ingredientGroupLabel": "肉", "ingredientSize": 2},
			{"name": "G", "gridCell": {"row": 3, "column": 1}, "successMin": 135,
			 "ingredientGroupId": "bottom", "ingredientGroupLabel": "肉", "ingredientSize": 2},
			{"name": "H", "gridCell": {"row": 3, "column": 2}, "successMin": 135,
			 "ingredientGroupId": "bottom", "ingredientGroupLabel": "肉", "ingredientSize": 2},
		]
		columns = cooking.to_columns(items, {"肉": 1})
		self.assertEqual((columns["group_b"], columns["group_c"]), (1, 1))
		self.assertEqual((columns["group_g"], columns["group_h"]), (2, 2))


class RegistryTest(unittest.TestCase):
	"""職人IDから変換モジュールを引けること"""

	def test_all_crafts_are_registered(self):
		self.assertEqual(
			sorted(mapping.CRAFT_CLASSES),
			["armor-smithing", "cooking", "sewing", "tool-smithing", "weapon-smithing", "woodworking"],
		)
		self.assertEqual(mapping.CRAFT_CLASSES["cooking"], 6)

	def test_get_mapping_returns_module_for_craft(self):
		self.assertIs(mapping.get_mapping("weapon-smithing"), smithing)
		self.assertIs(mapping.get_mapping("woodworking"), wood)

	def test_table_names_follow_craft(self):
		self.assertEqual(mapping.recipe_table("armor-smithing"), "armor_recipes")
		self.assertEqual(mapping.category_table("cooking"), "cooking_category")
		self.assertEqual(mapping.character_table("tool-smithing"), "smith_character")


if __name__ == "__main__":
	unittest.main()
