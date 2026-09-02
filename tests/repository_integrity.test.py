"""DDLで強制しない整合性の検証関数のテスト

DB接続を必要としないため、CI でもそのまま実行します。
"""

import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

from repository import integrity

PAIR_DIRECTIONS = {"肉": "horizontal", "魚": "vertical", "野菜": None}


def cell(name, row, column, **extra):
	return {"name": name, "gridCell": {"row": row, "column": column}, **extra}


class UniqueCoordinateTest(unittest.TestCase):
	def test_accepts_distinct_coordinates(self):
		cells = {"A": (1, 1), "B": (1, 2), "C": (2, 1)}
		self.assertEqual(integrity.check_unique_coordinates(cells, "ハンマー"), [])

	def test_rejects_duplicated_coordinate(self):
		cells = {"A": (1, 1), "B": (1, 1)}
		errors = integrity.check_unique_coordinates(cells, "ハンマー")
		self.assertEqual(len(errors), 1)
		self.assertIn("重複", errors[0])


class CategoryCellTest(unittest.TestCase):
	CATEGORY = {"A": (1, 1), "B": (1, 2)}

	def test_accepts_matching_cells(self):
		self.assertEqual(integrity.check_category_cells(self.CATEGORY, dict(self.CATEGORY), "ルアー"), [])

	def test_reports_missing_and_extra_cells(self):
		errors = integrity.check_category_cells(self.CATEGORY, {"A": (1, 1), "C": (2, 1)}, "ルアー")
		self.assertEqual(len(errors), 2)

	def test_reports_coordinate_mismatch(self):
		errors = integrity.check_category_cells(self.CATEGORY, {"A": (1, 1), "B": (2, 1)}, "ルアー")
		self.assertEqual(len(errors), 1)
		self.assertIn("座標", errors[0])


class IngredientGroupTest(unittest.TestCase):
	def test_accepts_adjacent_pair(self):
		items = [
			cell("B", 1, 2, ingredientGroupId="group-1", ingredientGroupLabel="肉"),
			cell("C", 1, 3, ingredientGroupId="group-1", ingredientGroupLabel="肉"),
		]
		self.assertEqual(integrity.check_ingredient_groups(items, PAIR_DIRECTIONS, "バトルステーキ"), [])

	def test_rejects_non_adjacent_pair(self):
		items = [
			cell("A", 1, 1, ingredientGroupId="group-1", ingredientGroupLabel="肉"),
			cell("C", 1, 3, ingredientGroupId="group-1", ingredientGroupLabel="肉"),
		]
		errors = integrity.check_ingredient_groups(items, PAIR_DIRECTIONS, "架空")
		self.assertIn("隣接していません", errors[0])

	def test_rejects_wrong_direction(self):
		"""魚は縦のため、横に並んだ2マスは不正です。"""
		items = [
			cell("B", 1, 2, ingredientGroupId="group-1", ingredientGroupLabel="魚"),
			cell("C", 1, 3, ingredientGroupId="group-1", ingredientGroupLabel="魚"),
		]
		self.assertEqual(len(integrity.check_ingredient_groups(items, PAIR_DIRECTIONS, "架空")), 1)

	def test_rejects_group_size_other_than_two(self):
		items = [
			cell("A", 1, 1, ingredientGroupId="group-1", ingredientGroupLabel="肉"),
			cell("B", 1, 2, ingredientGroupId="group-1", ingredientGroupLabel="肉"),
			cell("C", 1, 3, ingredientGroupId="group-1", ingredientGroupLabel="肉"),
		]
		errors = integrity.check_ingredient_groups(items, PAIR_DIRECTIONS, "架空")
		self.assertIn("2マス固定", errors[0])

	def test_rejects_group_on_single_cell_material(self):
		items = [
			cell("A", 1, 1, ingredientGroupId="group-1", ingredientGroupLabel="野菜"),
			cell("B", 1, 2, ingredientGroupId="group-1", ingredientGroupLabel="野菜"),
		]
		errors = integrity.check_ingredient_groups(items, PAIR_DIRECTIONS, "架空")
		self.assertIn("1マス食材", errors[0])

	def test_ignores_items_without_group(self):
		items = [cell("A", 1, 1), cell("B", 1, 2, ingredientGroupLabel="野菜")]
		self.assertEqual(integrity.check_ingredient_groups(items, PAIR_DIRECTIONS, "架空"), [])


class GridCellTest(unittest.TestCase):
	"""裁縫・木工・調理のマス名と座標の対応"""

	def test_accepts_matching_grid_cells(self):
		items = [cell("A", 1, 1), cell("E", 2, 2), cell("I", 3, 3)]
		self.assertEqual(integrity.check_grid_cells(items, "アタマ"), [])

	def test_rejects_mismatched_coordinate(self):
		errors = integrity.check_grid_cells([cell("A", 2, 1)], "アタマ")
		self.assertIn("想定", errors[0])

	def test_rejects_unknown_cell_name(self):
		errors = integrity.check_grid_cells([cell("Z", 1, 1)], "アタマ")
		self.assertIn("存在しません", errors[0])


class RaiseForErrorsTest(unittest.TestCase):
	def test_raises_when_errors_exist(self):
		with self.assertRaises(integrity.IntegrityError):
			integrity.raise_for_errors(["エラー1", "エラー2"])

	def test_does_nothing_when_empty(self):
		self.assertIsNone(integrity.raise_for_errors([]))


if __name__ == "__main__":
	unittest.main()
