"""レシピ名を含む参照用ビュー (v_*_recipes) の結合テスト。

0006_add_recipe_name_views.sql が追加するビューについて、
件数・列順序・craft_master.name との一致を検証します。
TEST_DATABASE_URL がある場合のみ実行し、未設定ならスキップします。
"""

import importlib.util
import os
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MIGRATION_DIR = REPO_ROOT / "api" / "migrations"
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")

# (ビュー名, 元テーブル名) の対応。全職人分を網羅します。
RECIPE_VIEWS = (
	("v_tool_recipes", "tool_recipes"),
	("v_weapon_recipes", "weapon_recipes"),
	("v_armor_recipes", "armor_recipes"),
	("v_sewing_recipes", "sewing_recipes"),
	("v_wood_recipes", "wood_recipes"),
	("v_cooking_recipes", "cooking_recipes"),
)


def load_apply_module():
	"""apply.py はパッケージ配下ではないためファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(
		"dq10_recipe_name_views_apply", MIGRATION_DIR / "apply.py"
	)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class RecipeNameViewTest(unittest.TestCase):
	"""空のDBへ全マイグレーションを適用し、レシピ名付きビューを検証します。"""

	def setUp(self):
		import psycopg

		self.apply = load_apply_module()
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply.apply_all(self.conn)

	def tearDown(self):
		self.conn.close()

	def test_view_row_count_matches_source_table(self):
		for view_name, table_name in RECIPE_VIEWS:
			with self.subTest(view=view_name):
				view_count = self.conn.execute(f"SELECT count(*) FROM {view_name}").fetchone()[0]
				table_count = self.conn.execute(f"SELECT count(*) FROM {table_name}").fetchone()[0]
				self.assertGreater(table_count, 0)
				self.assertEqual(view_count, table_count)

	def test_view_columns_start_with_id_then_name(self):
		for view_name, _ in RECIPE_VIEWS:
			with self.subTest(view=view_name):
				cursor = self.conn.execute(f"SELECT * FROM {view_name} LIMIT 0")
				column_names = [column.name for column in cursor.description]
				self.assertEqual(column_names[0], "id")
				self.assertEqual(column_names[1], "name")

	def test_view_name_matches_craft_master(self):
		for view_name, table_name in RECIPE_VIEWS:
			with self.subTest(view=view_name):
				mismatches = self.conn.execute(
					f"""
					SELECT count(*)
					FROM {view_name} AS view
					JOIN craft_master AS master ON master.id = view.id
					WHERE view.name IS DISTINCT FROM master.name
					"""
				).fetchone()[0]
				self.assertEqual(mismatches, 0)

	def test_view_includes_inactive_rows_without_filtering(self):
		"""ビュー自身は is_active でフィルタしないため、全ビューで非アクティブ行も含まれます。"""
		for view_name, table_name in RECIPE_VIEWS:
			with self.subTest(view=view_name):
				recipe_id = self.conn.execute(
					f"SELECT id FROM {table_name} LIMIT 1"
				).fetchone()[0]
				self.conn.execute(
					"UPDATE craft_master SET is_active = false WHERE id = %s", (recipe_id,)
				)
				self.conn.execute(
					f"UPDATE {table_name} SET is_active = false WHERE id = %s", (recipe_id,)
				)
				self.conn.commit()
				row = self.conn.execute(
					f"""
					SELECT craft_master_is_active, recipe_is_active
					FROM {view_name}
					WHERE id = %s
					""",
					(recipe_id,),
				).fetchone()
				self.assertEqual(row, (False, False))


if __name__ == "__main__":
	unittest.main()
