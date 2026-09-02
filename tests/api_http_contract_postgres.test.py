"""PostgreSQL保存時のHTTPレシピAPI契約を確認する。"""

import copy
import importlib.util
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")
MIGRATION_DIR = REPO_ROOT / "api" / "migrations"
sys.path.insert(0, str(REPO_ROOT / "tests" / "helpers"))

from recipe_loader import load_fallback_recipes


def load_script(path, name):
	"""パッケージ配下ではないスクリプトをファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(name, path)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class PostgresApiHttpContractTest(unittest.TestCase):
	"""PostgreSQLストアを選択したHTTP APIをテストDBで確認する。"""

	def setUp(self):
		import psycopg

		apply = load_script(MIGRATION_DIR / "apply.py", "dq10_postgres_http_apply")
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		apply.apply_all(self.conn)

		self.environment = patch.dict(os.environ, {
			"RECIPE_STORE": "postgres",
			"DATABASE_URL": TEST_DATABASE_URL,
		})
		self.environment.start()
		self.api = load_script(REPO_ROOT / "api" / "main.py", "dq10_postgres_http_main")
		self.original_log_message = self.api.Handler.log_message
		self.api.Handler.log_message = lambda *args: None
		self.server = self.api.ThreadingHTTPServer(("127.0.0.1", 0), self.api.Handler)
		self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
		self.thread.start()

	def tearDown(self):
		self.server.shutdown()
		self.server.server_close()
		self.thread.join()
		self.api.Handler.log_message = self.original_log_message
		self.environment.stop()
		self.conn.close()

	def request_json(self, method, path, payload=None):
		"""HTTPレスポンスをステータスとJSONに分けて返します。"""
		request = urllib.request.Request(
			f"http://127.0.0.1:{self.server.server_address[1]}{path}",
			data=None if payload is None else json.dumps(payload).encode("utf-8"),
			method=method,
			headers={"Content-Type": "application/json"},
		)
		try:
			with urllib.request.urlopen(request) as response:
				return response.status, json.loads(response.read())
		except urllib.error.HTTPError as error:
			with error:
				return error.code, json.loads(error.read())

	def recipe_copy(self):
		"""既存の調理レシピを、書き込み用に独立した値として返します。"""
		recipes = load_fallback_recipes("cooking")
		return copy.deepcopy(next(recipe for recipe in recipes if recipe["id"] == "cooking-003"))

	def test_put_get_and_delete_use_postgres_store(self):
		recipe = self.recipe_copy()
		recipe.update({
			"id": "http-contract-postgres",
			"name": "HTTP契約PostgreSQLレシピ",
			"category": "HTTP契約分類",
			"categoryId": "http-contract-category",
		})

		status, payload = self.request_json(
			"PUT", "/api/crafts/cooking/recipes/http-contract-postgres", recipe
		)
		self.assertEqual(status, 200)
		self.assertEqual(payload, {"craftId": "cooking", "recipe": recipe})
		status, payload = self.request_json("GET", "/api/crafts/cooking/recipes")
		self.assertEqual(status, 200)
		self.assertIn(recipe["id"], [item["id"] for item in payload["recipes"]])
		status, payload = self.request_json(
			"DELETE", "/api/crafts/cooking/recipes/http-contract-postgres"
		)
		self.assertEqual(status, 200)
		self.assertEqual(payload, {"craftId": "cooking", "deletedId": recipe["id"]})
		status, payload = self.request_json("GET", "/api/crafts/cooking/recipes")
		self.assertEqual(status, 200)
		self.assertNotIn(recipe["id"], [item["id"] for item in payload["recipes"]])

	def test_put_integrity_error_returns_bad_request(self):
		recipe = self.recipe_copy()
		recipe.update({
			"id": "http-contract-rollback",
			"name": "HTTP整合性エラー",
			"category": "HTTPロールバック分類",
			"categoryId": "http-rollback-category",
			"traitId": "unregistered-trait",
		})

		status, payload = self.request_json(
			"PUT", "/api/crafts/cooking/recipes/http-contract-rollback", recipe
		)

		self.assertEqual(status, 400)
		self.assertIn("未登録の特性", payload["error"])
		self.assertIsNone(
			self.conn.execute("SELECT id FROM craft_master WHERE legacy_id = %s", (recipe["id"],)).fetchone()
		)

	def test_put_duplicate_name_returns_bad_request(self):
		recipe = self.recipe_copy()
		recipe.update({
			"id": "http-contract-duplicate-name",
			"name": "みかわしオムレツ",
		})

		status, payload = self.request_json(
			"PUT", "/api/crafts/cooking/recipes/http-contract-duplicate-name", recipe
		)

		self.assertEqual(status, 400)
		self.assertEqual(payload, {"error": "recipe_name_already_exists"})

	def test_put_different_cells_for_existing_category_returns_bad_request(self):
		recipe = self.tool_recipe_copy("super-smithing-hammer")
		recipe.update({"id": "http-hammer-four-cells", "name": "HTTP 4マスハンマー"})
		recipe["items"] = recipe["items"][:-1]

		status, payload = self.request_json(
			"PUT", "/api/crafts/tool-smithing/recipes/http-hammer-four-cells", recipe
		)

		self.assertEqual(status, 400)
		self.assertEqual(payload, {"error": "recipe_cells_mismatch_category"})

	def test_put_existing_recipe_with_its_own_name_succeeds(self):
		recipe = self.recipe_copy()
		recipe["items"][0]["successMin"] += 1
		recipe["items"][0]["target"] += 1
		recipe["items"][0]["successMax"] += 1

		status, payload = self.request_json(
			"PUT", f"/api/crafts/cooking/recipes/{recipe['id']}", recipe
		)

		self.assertEqual(status, 200)
		self.assertEqual(payload, {"craftId": "cooking", "recipe": recipe})

	def test_put_recipe_id_belonging_to_another_craft_returns_bad_request_without_changes(self):
		recipe = self.recipe_copy()
		recipe.update({
			"id": "woodworking-stick-template",
			"name": "乗っ取りレシピ",
		})
		counts_before = self.recipe_counts("cooking", "woodworking")

		status, payload = self.request_json(
			"PUT", "/api/crafts/cooking/recipes/woodworking-stick-template", recipe
		)

		self.assertEqual(status, 400)
		self.assertEqual(payload, {"error": "recipe_id_belongs_to_other_craft"})
		self.assertEqual(self.recipe_counts("cooking", "woodworking"), counts_before)

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

	def tool_recipe_copy(self, recipe_id):
		"""道具鍛冶の既存レシピを、書き込み用に独立した値で返します。"""
		recipes = load_fallback_recipes("tool-smithing")
		return copy.deepcopy(next(recipe for recipe in recipes if recipe["id"] == recipe_id))


if __name__ == "__main__":
	unittest.main()
