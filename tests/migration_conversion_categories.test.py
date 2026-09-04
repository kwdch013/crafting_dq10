"""変換用分類の再割り当てマイグレーションを検証します。"""

import importlib.util
import os
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MIGRATION_DIR = REPO_ROOT / "api" / "migrations"
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")


def load_apply_module():
	"""apply.py はパッケージ配下ではないためファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(
		"dq10_conversion_categories_apply", MIGRATION_DIR / "apply.py"
	)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class ConversionCategoryMigrationTest(unittest.TestCase):
	"""空のDBへ全マイグレーションを適用して分類の到達可能性を確認します。"""

	def setUp(self):
		import psycopg

		self.apply = load_apply_module()
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply.apply_all(self.conn)

	def tearDown(self):
		self.conn.close()

	def test_active_unarchived_recipes_belong_to_active_legacy_categories(self):
		invalid_recipes = self.conn.execute(
			"""
			SELECT craft_id, legacy_id, name
			FROM (
				SELECT 'tool-smithing' AS craft_id, master.legacy_id, master.name
				FROM craft_master AS master
				JOIN tool_recipes AS recipe ON recipe.id = master.id
				JOIN tool_category AS category ON category.category_id = recipe.category_id
				WHERE master.is_active AND NOT master.archived
					AND (category.legacy_category_id IS NULL OR NOT category.is_active)
				UNION ALL
				SELECT 'weapon-smithing', master.legacy_id, master.name
				FROM craft_master AS master
				JOIN weapon_recipes AS recipe ON recipe.id = master.id
				JOIN weapon_category AS category ON category.category_id = recipe.category_id
				WHERE master.is_active AND NOT master.archived
					AND (category.legacy_category_id IS NULL OR NOT category.is_active)
				UNION ALL
				SELECT 'armor-smithing', master.legacy_id, master.name
				FROM craft_master AS master
				JOIN armor_recipes AS recipe ON recipe.id = master.id
				JOIN armor_category AS category ON category.category_id = recipe.category_id
				WHERE master.is_active AND NOT master.archived
					AND (category.legacy_category_id IS NULL OR NOT category.is_active)
				UNION ALL
				SELECT 'sewing', master.legacy_id, master.name
				FROM craft_master AS master
				JOIN sewing_recipes AS recipe ON recipe.id = master.id
				JOIN sewing_category AS category ON category.category_id = recipe.category_id
				WHERE master.is_active AND NOT master.archived
					AND (category.legacy_category_id IS NULL OR NOT category.is_active)
				UNION ALL
				SELECT 'woodworking', master.legacy_id, master.name
				FROM craft_master AS master
				JOIN wood_recipes AS recipe ON recipe.id = master.id
				JOIN wood_category AS category ON category.category_id = recipe.category_id
				WHERE master.is_active AND NOT master.archived
					AND (category.legacy_category_id IS NULL OR NOT category.is_active)
				UNION ALL
				SELECT 'cooking', master.legacy_id, master.name
				FROM craft_master AS master
				JOIN cooking_recipes AS recipe ON recipe.id = master.id
				JOIN cooking_category AS category ON category.category_id = recipe.category_id
				WHERE master.is_active AND NOT master.archived
					AND (category.legacy_category_id IS NULL OR NOT category.is_active)
			) AS invalid_recipes
			ORDER BY craft_id, legacy_id
			"""
		).fetchall()
		self.assertEqual(invalid_recipes, [])

	def test_conversion_categories_are_inactive_and_uncategorized_remains_active(self):
		for table in ("weapon_category", "armor_category", "tool_category"):
			with self.subTest(table=table):
				active_conversion_categories = self.conn.execute(
					f"""
					SELECT category_id
					FROM {table}
					WHERE legacy_category_id IS NULL
						AND category_id <> 0
						AND is_active
					"""
				).fetchall()
				uncategorized_is_active = self.conn.execute(
					f"SELECT is_active FROM {table} WHERE category_id = 0"
				).fetchone()[0]
				self.assertEqual(active_conversion_categories, [])
				self.assertTrue(uncategorized_is_active)

	def test_template_recipes_keep_archived_state(self):
		archived_states = dict(self.conn.execute(
			"""
			SELECT legacy_id, archived
			FROM craft_master
			WHERE legacy_id IN (
				'weapon-vertical-3',
				'armor-2x2',
				'tool-vertical-3',
				'tool-2x2'
			)
			"""
		).fetchall())
		self.assertEqual(
			archived_states,
			{
				"weapon-vertical-3": False,
				"armor-2x2": False,
				"tool-vertical-3": True,
				"tool-2x2": True,
			},
		)


if __name__ == "__main__":
	unittest.main()
