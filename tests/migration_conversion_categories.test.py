"""変換用分類の再割り当てマイグレーションを検証します。"""

import importlib.util
import os
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MIGRATION_DIR = REPO_ROOT / "api" / "migrations"
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")

CONVERSION_RECIPE_DESTINATIONS = (
	("weapon-vertical-3", "weapon_recipes", "weapon_category", "one-handed-sword"),
	("armor-2x2", "armor_recipes", "armor_category", "shield"),
	("tool-vertical-3", "tool_recipes", "tool_category", "woodworking-knife"),
	("tool-2x2", "tool_recipes", "tool_category", "smithing-hammer"),
)

COOKING_RECIPE_DESTINATIONS = {
	"cooking-001": "meat-dishes",
	"cooking-002": "meat-dishes",
	"cooking-006": "meat-dishes",
	"cooking-014": "meat-dishes",
	"cooking-019": "meat-dishes",
	"cooking-022": "meat-dishes",
	"cooking-024": "meat-dishes",
	"cooking-025": "meat-dishes",
	"cooking-026": "meat-dishes",
	"cooking-027": "meat-dishes",
	"cooking-028": "meat-dishes",
}

INACTIVE_CONVERSION_CATEGORIES = {
	"weapon_category": {"テンプレート (縦3マス)"},
	"armor_category": {"テンプレート (2×2)"},
	"tool_category": {"テンプレート (縦3マス)", "テンプレート (2×2)"},
}


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

	def test_conversion_recipes_are_reassigned_to_expected_categories(self):
		for legacy_id, recipe_table, category_table, expected_category_id in CONVERSION_RECIPE_DESTINATIONS:
			with self.subTest(legacy_id=legacy_id):
				actual_category_id = self.conn.execute(
					f"""
					SELECT category.legacy_category_id
					FROM craft_master AS master
					JOIN {recipe_table} AS recipe ON recipe.id = master.id
					JOIN {category_table} AS category ON category.category_id = recipe.category_id
					WHERE master.legacy_id = %s
					""",
					(legacy_id,),
				).fetchone()[0]
				self.assertEqual(actual_category_id, expected_category_id)

	def test_cooking_recipes_are_reassigned_to_meat_dishes(self):
		legacy_ids = list(COOKING_RECIPE_DESTINATIONS)
		meat_dishes_count = self.conn.execute(
			"""
			SELECT count(*)
			FROM craft_master AS master
			JOIN cooking_recipes AS recipe ON recipe.id = master.id
			JOIN cooking_category AS category ON category.category_id = recipe.category_id
			WHERE master.legacy_id = ANY(%s)
				AND category.legacy_category_id = 'meat-dishes'
			""",
			(legacy_ids,),
		).fetchone()[0]
		actual_destinations = dict(self.conn.execute(
			"""
			SELECT master.legacy_id, category.legacy_category_id
			FROM craft_master AS master
			JOIN cooking_recipes AS recipe ON recipe.id = master.id
			JOIN cooking_category AS category ON category.category_id = recipe.category_id
			WHERE master.legacy_id = ANY(%s)
			ORDER BY master.legacy_id
			""",
			(legacy_ids,),
		).fetchall())
		self.assertEqual(meat_dishes_count, 11)
		self.assertEqual(actual_destinations, COOKING_RECIPE_DESTINATIONS)

	def test_only_expected_conversion_categories_are_inactive(self):
		for table, expected_names in INACTIVE_CONVERSION_CATEGORIES.items():
			with self.subTest(table=table):
				inactive_categories = self.conn.execute(
					f"""
					SELECT category_name, legacy_category_id
					FROM {table}
					WHERE NOT is_active
					ORDER BY category_name
					"""
				).fetchall()
				uncategorized_is_active = self.conn.execute(
					f"SELECT is_active FROM {table} WHERE category_id = 0"
				).fetchone()[0]
				self.assertEqual(
					inactive_categories,
					[(name, None) for name in sorted(expected_names)],
				)
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
