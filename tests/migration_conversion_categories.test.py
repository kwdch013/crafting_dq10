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

CONVERSION_MIGRATION_NAME = "0005_reassign_conversion_categories.sql"
OUTSIDE_COOKING_RECIPE_LEGACY_ID = "test-cooking-outside-conversion"
OUTSIDE_CONVERSION_CATEGORIES = (
	("weapon_category", 999, "対象外の未分類武器分類"),
	("armor_category", 999, "対象外の未分類防具分類"),
	("tool_category", 999, "対象外の未分類道具分類"),
)


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
			for category_name in expected_names:
				with self.subTest(table=table, category_name=category_name):
					is_active = self.conn.execute(
						f"""
						SELECT is_active
						FROM {table}
						WHERE legacy_category_id IS NULL
							AND category_name = %s
						""",
						(category_name,),
					).fetchone()[0]
					self.assertFalse(is_active)

			with self.subTest(table=table, category_name="未分類"):
				uncategorized_is_active = self.conn.execute(
					f"SELECT is_active FROM {table} WHERE category_id = 0"
				).fetchone()[0]
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


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class ConversionCategoryScopeMigrationTest(unittest.TestCase):
	"""0005の更新対象を、0004までのデータに追加した対象外レコードで検証します。"""

	def setUp(self):
		import psycopg

		self.apply = load_apply_module()
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply.ensure_schema_migration(self.conn)
		migration_files = self.apply.migration_files()
		self.conversion_migration = next(
			path for path in migration_files if path.name == CONVERSION_MIGRATION_NAME
		)
		for path in migration_files:
			if path.name < CONVERSION_MIGRATION_NAME:
				self.apply.apply_migration(self.conn, path)

		self.add_outside_conversion_records()
		self.apply.apply_migration(self.conn, self.conversion_migration)

	def tearDown(self):
		self.conn.close()

	def add_outside_conversion_records(self):
		"""広いWHERE句で巻き込まれるデータを、0005適用前に明示的に用意します。"""
		recipe_id = self.conn.execute(
			"""
			INSERT INTO craft_master (legacy_id, name, class, sort_order)
			VALUES (%s, %s, 6, 999)
			RETURNING id
			""",
			(OUTSIDE_COOKING_RECIPE_LEGACY_ID, "対象外の未分類調理レシピ"),
		).fetchone()[0]
		self.conn.execute(
			"INSERT INTO cooking_recipes (id, category_id) VALUES (%s, 0)",
			(recipe_id,),
		)
		for table, category_id, category_name in OUTSIDE_CONVERSION_CATEGORIES:
			self.conn.execute(
				f"""
				INSERT INTO {table} (category_id, category_name, legacy_category_id)
				VALUES (%s, %s, NULL)
				""",
				(category_id, category_name),
			)
		self.conn.commit()

	def test_outside_uncategorized_cooking_recipe_is_not_reassigned(self):
		category_id = self.conn.execute(
			"""
			SELECT recipe.category_id
			FROM craft_master AS master
			JOIN cooking_recipes AS recipe ON recipe.id = master.id
			WHERE master.legacy_id = %s
			""",
			(OUTSIDE_COOKING_RECIPE_LEGACY_ID,),
		).fetchone()[0]
		self.assertEqual(category_id, 0)

	def test_outside_null_legacy_categories_remain_active(self):
		for table, category_id, category_name in OUTSIDE_CONVERSION_CATEGORIES:
			with self.subTest(table=table, category_name=category_name):
				is_active = self.conn.execute(
					f"""
					SELECT is_active
					FROM {table}
					WHERE category_id = %s
						AND legacy_category_id IS NULL
					""",
					(category_id,),
				).fetchone()[0]
				self.assertTrue(is_active)


if __name__ == "__main__":
	unittest.main()
