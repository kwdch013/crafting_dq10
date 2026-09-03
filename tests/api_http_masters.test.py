"""マスタ参照APIのHTTP契約を確認する。"""

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


def load_script(path, name):
	"""パッケージ配下ではないスクリプトをファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(name, path)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


class ApiHttpTestCase(unittest.TestCase):
	"""HTTPサーバーを起動してJSON応答を検証する共通基底です。"""

	def start_server(self, module):
		self.api = module
		self.original_log_message = self.api.Handler.log_message
		self.api.Handler.log_message = lambda *args: None
		self.server = self.api.ThreadingHTTPServer(("127.0.0.1", 0), self.api.Handler)
		self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
		self.thread.start()

	def stop_server(self):
		self.server.shutdown()
		self.server.server_close()
		self.thread.join()
		self.api.Handler.log_message = self.original_log_message

	def request_json(self, path):
		"""GETレスポンスをステータスとJSONに分けて返します。"""
		request = urllib.request.Request(
			f"http://127.0.0.1:{self.server.server_address[1]}{path}", method="GET"
		)
		try:
			with urllib.request.urlopen(request) as response:
				return response.status, json.loads(response.read())
		except urllib.error.HTTPError as error:
			with error:
				return error.code, json.loads(error.read())


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class PostgresMastersApiHttpTest(ApiHttpTestCase):
	"""PostgreSQLストアのマスタ参照を実HTTPで確認する。"""

	def setUp(self):
		import psycopg

		apply = load_script(MIGRATION_DIR / "apply.py", "dq10_masters_apply")
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		apply.apply_all(self.conn)
		self.environment = patch.dict(os.environ, {
			"RECIPE_STORE": "postgres",
			"DATABASE_URL": TEST_DATABASE_URL,
		})
		self.environment.start()
		self.start_server(load_script(REPO_ROOT / "api" / "main.py", "dq10_masters_postgres_main"))

	def tearDown(self):
		self.stop_server()
		self.environment.stop()
		self.conn.close()

	def test_smithing_categories_include_stored_coordinates(self):
		status, payload = self.request_json("/api/crafts/tool-smithing/masters")

		self.assertEqual(status, 200)
		self.assertEqual(payload["craftId"], "tool-smithing")
		self.assertEqual(payload["categories"][0], {
			"categoryId": 0, "legacyId": None, "name": "未分類", "cells": [],
		})
		hammer = next(category for category in payload["categories"] if category["legacyId"] == "smithing-hammer")
		self.assertEqual(hammer["cells"], [
			{"name": "A", "row": 1, "column": 1},
			{"name": "B", "row": 1, "column": 2},
			{"name": "C", "row": 2, "column": 1},
			{"name": "D", "row": 2, "column": 2},
			{"name": "E", "row": 3, "column": 1},
		])
		self.assertEqual(payload["traits"][0], {
			"charaId": 0, "legacyId": None, "name": "なし", "description": "なし、もしくは未追加",
		})
		self.assertEqual(payload["materials"], [])

	def test_grid_categories_expand_existing_cells(self):
		status, payload = self.request_json("/api/crafts/sewing/masters")

		self.assertEqual(status, 200)
		head = next(category for category in payload["categories"] if category["legacyId"] == "head")
		self.assertEqual(head["cells"], [
			{"name": "B", "row": 1, "column": 2},
			{"name": "D", "row": 2, "column": 1},
			{"name": "E", "row": 2, "column": 2},
			{"name": "F", "row": 2, "column": 3},
		])
		self.assertEqual(payload["materials"], [])

	def test_cooking_returns_materials_and_empty_category_cells(self):
		status, payload = self.request_json("/api/crafts/cooking/masters")

		self.assertEqual(status, 200)
		self.assertTrue(all(category["cells"] == [] for category in payload["categories"]))
		self.assertEqual(payload["materials"], [
			{"materialId": 1, "name": "肉", "imagePath": "./assets/cooking/ingredient-meat.png", "pairDirection": "horizontal"},
			{"materialId": 2, "name": "魚", "imagePath": "./assets/cooking/ingredient-fish.png", "pairDirection": "vertical"},
			{"materialId": 3, "name": "野菜", "imagePath": "./assets/cooking/ingredient-vegetable.png", "pairDirection": None},
			{"materialId": 4, "name": "麺", "imagePath": "./assets/cooking/ingredient-noodle.png", "pairDirection": None},
			{"materialId": 5, "name": "卵", "imagePath": "./assets/cooking/ingredient-egg.png", "pairDirection": None},
			{"materialId": 6, "name": "小麦", "imagePath": "./assets/cooking/ingredient-wheat.png", "pairDirection": None},
		])

	def test_inactive_master_rows_are_excluded(self):
		self.conn.execute("UPDATE cooking_category SET is_active = false WHERE category_id = 0")
		self.conn.execute("UPDATE cooking_character SET is_active = false WHERE chara_id = 0")
		self.conn.execute("UPDATE cooking_materials SET is_active = false WHERE material_id = 1")
		self.conn.commit()

		status, payload = self.request_json("/api/crafts/cooking/masters")

		self.assertEqual(status, 200)
		self.assertNotIn(0, [category["categoryId"] for category in payload["categories"]])
		self.assertNotIn(0, [trait["charaId"] for trait in payload["traits"]])
		self.assertNotIn(1, [material["materialId"] for material in payload["materials"]])

	def test_unknown_craft_returns_not_found(self):
		status, payload = self.request_json("/api/crafts/unknown/masters")

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})


class JsonMastersApiHttpTest(ApiHttpTestCase):
	"""JSONストアではマスタが利用できないことを実HTTPで確認する。"""

	def setUp(self):
		self.environment = patch.dict(os.environ, {"RECIPE_STORE": "json"})
		self.environment.start()
		self.start_server(load_script(REPO_ROOT / "api" / "main.py", "dq10_masters_json_main"))

	def tearDown(self):
		self.stop_server()
		self.environment.stop()

	def test_masters_are_unavailable_for_json_store(self):
		status, payload = self.request_json("/api/crafts/cooking/masters")

		self.assertEqual(status, 503)
		self.assertEqual(payload, {"error": "masters_unavailable"})


if __name__ == "__main__":
	unittest.main()
