"""PostgreSQLレシピストアの読み取りテスト。"""

import importlib.util
import copy
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

from repository.integrity import IntegrityError

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")
DATA_DIR = REPO_ROOT / "api" / "data"
MIGRATION_DIR = REPO_ROOT / "api" / "migrations"


def load_script(path, name):
	"""パッケージ配下ではないスクリプトをファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(name, path)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


# ラウンドトリップテストの正規化をそのまま利用し、変換仕様の定義を二重化しません。
ROUND_TRIP = load_script(REPO_ROOT / "tests" / "recipe_roundtrip.test.py", "dq10_recipe_roundtrip")


class CountingCursor:
	"""execute 呼び出し数を数えるカーソルのラッパー。"""

	def __init__(self, cursor, counter):
		self.cursor = cursor
		self.counter = counter

	def __enter__(self):
		self.cursor.__enter__()
		return self

	def __exit__(self, *args):
		return self.cursor.__exit__(*args)

	def execute(self, *args, **kwargs):
		self.counter["execute"] += 1
		return self.cursor.execute(*args, **kwargs)

	def __getattr__(self, name):
		return getattr(self.cursor, name)


class CountingConnection:
	"""実接続を保持したまま cursor.execute だけを計測します。"""

	def __init__(self, connection, counter):
		self.connection = connection
		self.counter = counter

	def __enter__(self):
		self.connection.__enter__()
		return self

	def __exit__(self, *args):
		return self.connection.__exit__(*args)

	def cursor(self, *args, **kwargs):
		return CountingCursor(self.connection.cursor(*args, **kwargs), self.counter)


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class PostgresRecipeStoreTest(unittest.TestCase):
	"""JSONを投入したテスト用DBから復元できることを確認する。"""

	def setUp(self):
		import psycopg

		self.apply = load_script(MIGRATION_DIR / "apply.py", "dq10_postgres_store_apply")
		self.importer = load_script(
			REPO_ROOT / "api" / "scripts" / "import_recipes.py", "dq10_postgres_store_import"
		)
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply.ensure_schema_migration(self.conn)
		for name in ("0001_init.sql", "0002_recipes.sql", "0003_seed_master.sql"):
			self.apply.apply_migration(self.conn, MIGRATION_DIR / name)
		self.importer.import_all(self.conn, DATA_DIR)

	def tearDown(self):
		self.conn.close()

	def store(self):
		from repository.postgres_store import PostgresRecipeStore

		return PostgresRecipeStore(TEST_DATABASE_URL)

	def original_recipes(self, craft_id):
		return json.loads((DATA_DIR / "crafts" / craft_id / "recipes.json").read_text(encoding="utf-8"))

	def test_load_craft_matches_normalized_json_for_all_crafts(self):
		for craft_id in ROUND_TRIP.CRAFT_IDS:
			with self.subTest(craft=craft_id):
				expected = [ROUND_TRIP.normalize(recipe, craft_id) for recipe in self.original_recipes(craft_id)]
				self.assertEqual(self.store().load_craft(craft_id), expected)

	def test_load_all_matches_each_craft_read(self):
		all_recipes = self.store().load_all()
		for craft_id in ROUND_TRIP.CRAFT_IDS:
			with self.subTest(craft=craft_id):
				self.assertEqual(all_recipes[craft_id], self.store().load_craft(craft_id))

	def test_load_all_keeps_json_store_key_order(self):
		from repository.json_store import JsonRecipeStore

		self.assertEqual(
			list(self.store().load_all()),
			list(JsonRecipeStore(DATA_DIR).load_all()),
		)

	def test_load_craft_keeps_sort_order_after_recipe_update(self):
		"""物理行の並びが変わっても職人別読取は sort_order を維持します。"""
		from repository import queries

		expected_ids = self.cooking_recipe_ids_in_sort_order()
		self.update_first_cooking_recipe()
		self.use_recipe_table_scan()

		self.assertEqual(
			[recipe["id"] for recipe in queries.load_recipes(self.conn, "cooking")],
			expected_ids,
		)

	def test_load_all_keeps_sort_order_after_recipe_update(self):
		"""物理行の並びが変わっても一括読取は職人内の sort_order を維持します。"""
		from repository import queries

		expected_ids = self.cooking_recipe_ids_in_sort_order()
		self.update_first_cooking_recipe()
		self.use_recipe_table_scan()

		self.assertEqual(
			[recipe["id"] for recipe in queries.load_all_recipes(self.conn)["cooking"]],
			expected_ids,
		)

	def test_load_craft_rejects_unknown_craft(self):
		from repository.errors import UnknownCraftError

		with self.assertRaisesRegex(UnknownCraftError, "^recipe_file_not_found$"):
			self.store().load_craft("unknown")

	def test_load_all_uses_one_execute(self):
		counter = {"execute": 0}
		connection = CountingConnection(self.conn, counter)
		store = self.store()

		with patch.object(store, "_connect", return_value=connection) as connect:
			store.load_all()

		self.assertEqual(connect.call_count, 1)
		self.assertEqual(counter["execute"], 1)

	def test_upsert_new_recipe_appends_sort_order_and_restores_values(self):
		recipe = self.recipe_copy("cooking", "cooking-003")
		recipe.update({
			"id": "postgres-cooking-new",
			"name": "PostgreSQL追加レシピ",
			"category": "PostgreSQL追加分類",
			"categoryId": "postgres-new-category",
		})
		max_sort_order = self.conn.execute(
			"SELECT max(sort_order) FROM craft_master WHERE class = 6"
		).fetchone()[0]

		result = self.store().upsert("cooking", recipe)

		self.assertEqual(result, {"craftId": "cooking", "recipe": recipe})
		self.assertEqual(
			self.conn.execute(
				"SELECT sort_order FROM craft_master WHERE legacy_id = %s",
				(recipe["id"],),
			).fetchone()[0],
			max_sort_order + 1,
		)
		self.assertEqual(
			self.store().load_craft("cooking")[-1],
			ROUND_TRIP.normalize(recipe, "cooking"),
		)

	def test_upsert_existing_recipe_keeps_sort_order(self):
		recipe = self.recipe_copy("cooking", "cooking-003")
		original_order = self.conn.execute(
			"SELECT sort_order FROM craft_master WHERE legacy_id = %s", (recipe["id"],)
		).fetchone()[0]
		original_position = [item["id"] for item in self.store().load_craft("cooking")].index(recipe["id"])
		recipe["items"][0]["successMin"] += 1
		recipe["items"][0]["target"] += 1
		recipe["items"][0]["successMax"] += 1

		self.store().upsert("cooking", recipe)

		self.assertEqual(
			self.conn.execute(
				"SELECT sort_order FROM craft_master WHERE legacy_id = %s", (recipe["id"],)
			).fetchone()[0],
			original_order,
		)
		loaded = self.store().load_craft("cooking")
		self.assertEqual([item["id"] for item in loaded].index(recipe["id"]), original_position)
		self.assertEqual(loaded[original_position], ROUND_TRIP.normalize(recipe, "cooking"))

	def test_upsert_rejects_name_used_by_another_recipe_in_same_craft(self):
		recipe = self.recipe_copy("cooking", "cooking-003")
		recipe.update({
			"id": "postgres-duplicate-name",
			"name": "みかわしオムレツ",
		})

		with self.assertRaisesRegex(IntegrityError, "^recipe_name_already_exists$"):
			self.store().upsert("cooking", recipe)

		self.assertIsNone(
			self.conn.execute(
				"SELECT id FROM craft_master WHERE legacy_id = %s", (recipe["id"],)
			).fetchone()
		)

	def test_upsert_allows_existing_recipe_to_keep_its_own_name(self):
		recipe = self.recipe_copy("cooking", "cooking-003")
		recipe["items"][0]["successMin"] += 1
		recipe["items"][0]["target"] += 1
		recipe["items"][0]["successMax"] += 1

		result = self.store().upsert("cooking", recipe)

		self.assertEqual(result, {"craftId": "cooking", "recipe": recipe})

	def test_upsert_rejects_recipe_id_belonging_to_another_craft_without_changes(self):
		recipe = self.recipe_copy("cooking", "cooking-003")
		recipe.update({
			"id": "woodworking-stick-template",
			"name": "乗っ取りレシピ",
		})
		counts_before = self.recipe_counts("cooking", "woodworking")

		with self.assertRaisesRegex(IntegrityError, "^recipe_id_belongs_to_other_craft$"):
			self.store().upsert("cooking", recipe)

		self.assertEqual(self.recipe_counts("cooking", "woodworking"), counts_before)

	def test_delete_logically_deletes_recipe_and_keeps_subtype_row(self):
		recipe_id = "cooking-003"
		master_id = self.conn.execute(
			"SELECT id FROM craft_master WHERE legacy_id = %s", (recipe_id,)
		).fetchone()[0]

		result = self.store().delete("cooking", recipe_id)

		self.assertEqual(result, {"craftId": "cooking", "deletedId": recipe_id})
		self.assertFalse(
			self.conn.execute("SELECT is_active FROM craft_master WHERE id = %s", (master_id,)).fetchone()[0]
		)
		self.assertEqual(
			self.conn.execute("SELECT count(*) FROM cooking_recipes WHERE id = %s", (master_id,)).fetchone()[0],
			1,
		)
		self.assertNotIn(recipe_id, [recipe["id"] for recipe in self.store().load_craft("cooking")])

	def test_upsert_revives_logically_deleted_recipe(self):
		recipe = self.recipe_copy("cooking", "cooking-003")
		self.store().delete("cooking", recipe["id"])

		self.store().upsert("cooking", recipe)

		self.assertTrue(
			self.conn.execute(
				"SELECT is_active FROM craft_master WHERE legacy_id = %s", (recipe["id"],)
			).fetchone()[0]
		)
		self.assertIn(recipe["id"], [item["id"] for item in self.store().load_craft("cooking")])

	def test_delete_unknown_recipe_returns_deleted_id(self):
		self.assertEqual(
			self.store().delete("cooking", "not-found"),
			{"craftId": "cooking", "deletedId": "not-found"},
		)

	def test_delete_does_not_affect_recipe_in_another_craft(self):
		recipe_id = "cooking-003"
		self.store().delete("tool-smithing", recipe_id)

		self.assertTrue(
			self.conn.execute(
				"SELECT is_active FROM craft_master WHERE legacy_id = %s", (recipe_id,)
			).fetchone()[0]
		)

	def test_write_rejects_unknown_craft(self):
		from repository.errors import UnknownCraftError

		with self.assertRaisesRegex(UnknownCraftError, "^recipe_file_not_found$"):
			self.store().upsert("unknown", {"id": "recipe-1", "name": "不正", "items": []})
		with self.assertRaisesRegex(UnknownCraftError, "^recipe_file_not_found$"):
			self.store().delete("unknown", "recipe-1")

	def test_delete_rejects_empty_recipe_id(self):
		with self.assertRaisesRegex(ValueError, "^invalid_recipe_id$"):
			self.store().delete("cooking", "")

	def test_upsert_rejects_invalid_recipe_items(self):
		with self.assertRaisesRegex(ValueError, "^invalid_recipe_items$"):
			self.store().upsert("cooking", {"id": "invalid", "name": "不正", "items": {}})

	def test_upsert_rolls_back_when_trait_validation_fails(self):
		recipe = self.recipe_copy("cooking", "cooking-003")
		recipe.update({
			"id": "postgres-rollback",
			"name": "ロールバック確認",
			"category": "ロールバック分類",
			"categoryId": "rollback-category",
			"traitId": "unregistered-trait",
		})

		with self.assertRaisesRegex(ValueError, "未登録の特性"):
			self.store().upsert("cooking", recipe)

		self.assertIsNone(
			self.conn.execute("SELECT id FROM craft_master WHERE legacy_id = %s", (recipe["id"],)).fetchone()
		)
		self.assertIsNone(
			self.conn.execute(
				"SELECT category_id FROM cooking_category WHERE category_name = %s",
				(recipe["category"],),
			).fetchone()
		)

	def recipe_copy(self, craft_id, recipe_id):
		"""投入済みのレシピを、書き込み用に独立した値として返します。"""
		return copy.deepcopy(next(
			recipe for recipe in self.original_recipes(craft_id) if recipe["id"] == recipe_id
		))

	def recipe_counts(self, *craft_ids):
		"""指定職人の見出し件数を職人ごとに返します。"""
		from repository import mapping

		return {
			craft_id: self.conn.execute(
				"SELECT count(*) FROM craft_master WHERE class = %s",
				(mapping.CRAFT_CLASSES[craft_id],),
			).fetchone()[0]
			for craft_id in craft_ids
		}

	def cooking_recipe_ids_in_sort_order(self):
		"""調理レシピの正規の配列順をマスタの sort_order から取得します。"""
		return [
			row[0]
			for row in self.conn.execute(
				"""
				SELECT legacy_id
				FROM craft_master
				WHERE class = 6 AND is_active
				ORDER BY sort_order
				"""
			).fetchall()
		]

	def update_first_cooking_recipe(self):
		"""先頭レシピを更新して、物理行の走査順に依存しないことを検証します。"""
		recipe_id = self.conn.execute(
			"""
			SELECT id
			FROM craft_master
			WHERE class = 6 AND is_active
			ORDER BY sort_order
			LIMIT 1
			"""
		).fetchone()[0]
		self.conn.execute(
			"UPDATE cooking_recipes SET a_min = a_min WHERE id = %s",
			(recipe_id,),
		)
		self.conn.commit()

	def use_recipe_table_scan(self):
		"""レシピ表を物理順で走査する計画にして、ORDER BY欠落を検出します。"""
		self.conn.execute("SET enable_indexscan TO off")
		self.conn.execute("SET enable_bitmapscan TO off")


if __name__ == "__main__":
	unittest.main()
