"""投入計画の組み立てのテスト

DB接続を必要としないため、CI でもそのまま実行します。
"""

import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

from repository import import_plan
from repository.integrity import IntegrityError

MATERIALS = {
	"肉": {"material_id": 1, "material_name": "肉", "pair_direction": "horizontal"},
	"野菜": {"material_id": 3, "material_name": "野菜", "pair_direction": None},
}


def item(name, row, column, minimum, maximum=None, **extra):
	return {
		"id": f"part-{name}",
		"name": name,
		"gridCell": {"row": row, "column": column},
		"current": 0,
		"target": minimum,
		"successMin": minimum,
		"successMax": maximum if maximum is not None else minimum,
		**extra,
	}


class TemplateCategoryNameTest(unittest.TestCase):
	"""大分類を持たない鍛冶レシピ向けの分類名"""

	def test_single_column_is_named_by_height(self):
		cells = {"A": (1, 1), "B": (2, 1), "C": (3, 1)}
		self.assertEqual(import_plan.template_category_name(cells), "テンプレート (縦3マス)")

	def test_single_row_is_named_by_width(self):
		cells = {"A": (1, 1), "B": (1, 2)}
		self.assertEqual(import_plan.template_category_name(cells), "テンプレート (横2マス)")

	def test_rectangle_is_named_by_shape(self):
		cells = {"A": (1, 1), "B": (1, 2), "C": (2, 1), "D": (2, 2)}
		self.assertEqual(import_plan.template_category_name(cells), "テンプレート (2×2)")

	def test_non_rectangle_is_named_by_coordinates(self):
		cells = {"A": (1, 1), "B": (1, 2), "C": (2, 1)}
		self.assertEqual(import_plan.template_category_name(cells), "テンプレート (1-1,1-2,2-1)")


class TraitTest(unittest.TestCase):
	def test_none_and_empty_are_treated_as_no_trait(self):
		for value in ("", "none", None):
			self.assertIsNone(import_plan.trait_of({"traitId": value}))

	def test_trait_id_is_kept(self):
		self.assertEqual(import_plan.trait_of({"traitId": "light"}), "light")


class SmithingPlanTest(unittest.TestCase):
	"""鍛冶は分類が座標を持ちます。"""

	def test_category_keeps_coordinates(self):
		recipes = [{
			"id": "super-smithing-hammer", "name": "超鍛冶ハンマー",
			"category": "ハンマー", "categoryId": "smithing-hammer",
			"items": [item("A", 1, 1, 130, 140), item("B", 1, 2, 105, 111)],
		}]
		plan = import_plan.build_plan("tool-smithing", recipes, {})
		self.assertEqual(plan.class_id, 1)
		category = plan.categories[0]
		self.assertEqual((category.name, category.legacy_id), ("ハンマー", "smithing-hammer"))
		self.assertEqual(category.columns["row_b"], 1)
		self.assertEqual(category.columns["col_b"], 2)
		self.assertEqual(plan.recipes[0].columns["a_max"], 140)
		self.assertEqual(plan.recipes[0].sort_order, 1)

	def test_recipe_without_category_gets_template(self):
		recipes = [{
			"id": "tool-2x2", "name": "道具 2×2テンプレート", "archived": True,
			"items": [item("A", 1, 1, 70, 86), item("B", 1, 2, 70, 86),
				item("C", 2, 1, 70, 86), item("D", 2, 2, 70, 86)],
		}]
		plan = import_plan.build_plan("tool-smithing", recipes, {})
		self.assertEqual(plan.categories[0].name, "テンプレート (2×2)")
		self.assertIsNone(plan.categories[0].legacy_id)
		self.assertTrue(plan.recipes[0].archived)

	def test_conflicting_cells_in_one_category_are_rejected(self):
		recipes = [
			{"id": "r1", "name": "1", "category": "ルアー", "categoryId": "lure",
				"items": [item("A", 1, 1, 10, 20)]},
			{"id": "r2", "name": "2", "category": "ルアー", "categoryId": "lure",
				"items": [item("A", 2, 1, 10, 20)]},
		]
		with self.assertRaises(IntegrityError):
			import_plan.build_plan("tool-smithing", recipes, {})

	def test_duplicated_coordinate_in_one_recipe_is_rejected(self):
		recipes = [{"id": "r1", "name": "1", "items": [item("A", 1, 1, 10, 20), item("B", 1, 1, 10, 20)]}]
		with self.assertRaises(IntegrityError):
			import_plan.build_plan("tool-smithing", recipes, {})


class GridPlanTest(unittest.TestCase):
	"""裁縫・木工は分類が使用マスを持ちます。"""

	def test_sewing_category_keeps_cell_flags(self):
		recipes = [{
			"id": "sewing-head-template", "name": "アタマテンプレート",
			"category": "アタマ", "categoryId": "head",
			"items": [item("B", 1, 2, 78), item("E", 2, 2, 78)],
		}]
		plan = import_plan.build_plan("sewing", recipes, {})
		self.assertEqual(plan.class_id, 4)
		self.assertTrue(plan.categories[0].columns["exist_b"])
		self.assertFalse(plan.categories[0].columns["exist_a"])
		self.assertEqual(plan.recipes[0].columns["value_e"], 78)

	def test_wood_keeps_grain_per_cell(self):
		recipes = [{
			"id": "woodworking-staff-template", "name": "スティック",
			"category": "スティック", "categoryId": "stick",
			"items": [item("B", 1, 2, 74, optionId="vertical"), item("E", 2, 2, 74, optionId="horizontal")],
		}]
		plan = import_plan.build_plan("woodworking", recipes, {})
		self.assertTrue(plan.recipes[0].columns["grain_b"])
		self.assertFalse(plan.recipes[0].columns["grain_e"])

	def test_mismatched_grid_coordinate_is_rejected(self):
		recipes = [{"id": "r1", "name": "1", "items": [item("B", 2, 2, 78)]}]
		with self.assertRaises(IntegrityError):
			import_plan.build_plan("sewing", recipes, {})


class CookingPlanTest(unittest.TestCase):
	"""調理は分類がマスを持たず、レシピ単位で使用マスを判定します。"""

	def test_materials_and_groups_are_planned(self):
		recipes = [{
			"id": "cooking-007", "name": "バトルステーキ",
			"category": "肉料理", "categoryId": "meat-dishes", "traitId": "light",
			"items": [
				item("B", 1, 2, 135, 165, optionId="cross", ingredientGroupId="top",
					ingredientGroupLabel="肉", ingredientSize=2),
				item("C", 1, 3, 135, 165, optionId="corner", ingredientGroupId="top",
					ingredientGroupLabel="肉", ingredientSize=2),
				item("F", 2, 3, 160, 190, optionId="cross", ingredientGroupLabel="野菜"),
			],
		}]
		plan = import_plan.build_plan("cooking", recipes, MATERIALS)
		self.assertEqual(plan.categories[0].columns, {})
		columns = plan.recipes[0].columns
		self.assertEqual((columns["material_b"], columns["group_b"]), (1, 1))
		self.assertEqual((columns["material_f"], columns["group_f"]), (3, None))
		self.assertEqual(plan.recipes[0].trait_id, "light")

	def test_non_adjacent_group_is_rejected(self):
		recipes = [{
			"id": "cooking-x", "name": "架空",
			"items": [
				item("A", 1, 1, 135, 165, ingredientGroupId="top", ingredientGroupLabel="肉", ingredientSize=2),
				item("C", 1, 3, 135, 165, ingredientGroupId="top", ingredientGroupLabel="肉", ingredientSize=2),
			],
		}]
		with self.assertRaises(IntegrityError):
			import_plan.build_plan("cooking", recipes, MATERIALS)


class CellValidationTest(unittest.TestCase):
	"""マスの重複と値の欠落は投入前に弾きます。"""

	def test_duplicated_cell_name_is_rejected(self):
		recipes = [{"id": "r1", "name": "1", "items": [item("A", 1, 1, 10, 20), item("A", 2, 1, 30, 40)]}]
		with self.assertRaises(IntegrityError):
			import_plan.build_plan("tool-smithing", recipes, {})

	def test_missing_smithing_maximum_is_rejected(self):
		cell = item("A", 1, 1, 10, 20)
		cell["successMax"] = None
		recipes = [{"id": "r1", "name": "1", "items": [cell]}]
		with self.assertRaises(IntegrityError):
			import_plan.build_plan("tool-smithing", recipes, {})

	def test_paired_material_without_group_is_rejected(self):
		recipes = [{
			"id": "cooking-x", "name": "架空",
			"items": [item("B", 1, 2, 135, 165, ingredientGroupLabel="肉", ingredientSize=2)],
		}]
		with self.assertRaises(IntegrityError):
			import_plan.build_plan("cooking", recipes, MATERIALS)


if __name__ == "__main__":
	unittest.main()
