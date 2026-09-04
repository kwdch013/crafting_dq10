import importlib.util
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch


def load_api_module():
	"""api/main.pyをパス指定で独立して読み込む。"""
	spec = importlib.util.spec_from_file_location("dq10_api_http_main", "api/main.py")
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


class ApiHttpContractTest(unittest.TestCase):
	"""実HTTP経由でJSON APIの応答形式とステータスを固定する。"""

	def setUp(self):
		self.environment = patch.dict(os.environ, {"RECIPE_STORE": "json"}, clear=False)
		self.environment.start()
		self.api = load_api_module()
		self.temp_dir = tempfile.TemporaryDirectory()
		self.data_dir = Path(self.temp_dir.name)
		self.original_data_dir = self.api.DATA_DIR
		self.original_log_message = self.api.Handler.log_message
		self.api.DATA_DIR = self.data_dir
		self.api.Handler.log_message = lambda *args: None
		(self.data_dir / "crafts" / "cooking").mkdir(parents=True)
		(self.data_dir / "catalog.json").write_text(
			json.dumps(
				{"crafts": [{"id": "cooking", "label": "調理職人"}]},
				ensure_ascii=False,
			),
			encoding="utf-8",
		)
		self.recipe_path = self.data_dir / "crafts" / "cooking" / "recipes.json"
		self.recipe_path.write_text(
			json.dumps(
				[{"id": "cooking-001", "name": "既存レシピ", "items": []}],
				ensure_ascii=False,
			),
			encoding="utf-8",
		)
		self.server = ThreadingHTTPServer(("127.0.0.1", 0), self.api.Handler)
		self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
		self.thread.start()

	def tearDown(self):
		self.server.shutdown()
		self.server.server_close()
		self.thread.join()
		self.api.Handler.log_message = self.original_log_message
		self.api.DATA_DIR = self.original_data_dir
		self.temp_dir.cleanup()
		self.environment.stop()

	def request(self, method, path, payload=None):
		"""4xxも本文・ヘッダとともに検証できる形で返す。"""
		data = payload if isinstance(payload, bytes) else None if payload is None else json.dumps(payload).encode("utf-8")
		request = urllib.request.Request(
			f"http://127.0.0.1:{self.server.server_address[1]}{path}",
			data=data,
			method=method,
			headers={"Content-Type": "application/json"},
		)
		try:
			with urllib.request.urlopen(request) as response:
				return response.status, response.headers, response.read()
		except urllib.error.HTTPError as error:
			with error:
				return error.code, error.headers, error.read()

	def request_json(self, method, path, payload=None):
		"""JSON応答をデコードしてステータス・ヘッダと返す。"""
		status, headers, body = self.request(method, path, payload)
		return status, headers, json.loads(body)

	def assert_common_success_headers(self, headers):
		"""JSONの成功応答に共通するキャッシュ・CORS契約を確認する。"""
		self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
		self.assertEqual(headers["Cache-Control"], "no-store")
		self.assertEqual(headers["Access-Control-Allow-Origin"], "*")

	def test_get_health_returns_ok(self):
		status, headers, payload = self.request_json("GET", "/health")

		self.assertEqual(status, 200)
		self.assertEqual(payload, {"status": "ok"})
		self.assert_common_success_headers(headers)

	def test_get_crafts_returns_catalog(self):
		status, headers, payload = self.request_json("GET", "/api/crafts")

		self.assertEqual(status, 200)
		self.assertEqual(payload, {"crafts": [{"id": "cooking", "label": "調理職人"}]})
		self.assert_common_success_headers(headers)

	def test_get_all_recipes_returns_crafts_mapping(self):
		status, headers, payload = self.request_json("GET", "/api/recipes")

		self.assertEqual(status, 200)
		self.assertEqual(
			payload,
			{"crafts": {"cooking": [{"id": "cooking-001", "name": "既存レシピ", "items": []}]}},
		)
		self.assert_common_success_headers(headers)

	def test_get_craft_recipes_returns_craft_id_and_recipes(self):
		status, headers, payload = self.request_json("GET", "/api/crafts/cooking/recipes")

		self.assertEqual(status, 200)
		self.assertEqual(
			payload,
			{"craftId": "cooking", "recipes": [{"id": "cooking-001", "name": "既存レシピ", "items": []}]},
		)
		self.assert_common_success_headers(headers)

	def test_get_deleted_recipes_returns_empty_list_for_json_store(self):
		status, headers, payload = self.request_json("GET", "/api/crafts/cooking/deleted-recipes")

		self.assertEqual(status, 200)
		self.assertEqual(payload, {"craftId": "cooking", "deletedIds": []})
		self.assert_common_success_headers(headers)

	def test_get_deleted_recipes_for_unknown_craft_returns_not_found(self):
		status, _, payload = self.request_json("GET", "/api/crafts/unknown/deleted-recipes")

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})

	def test_get_unknown_craft_returns_not_found(self):
		status, _, payload = self.request_json("GET", "/api/crafts/unknown/recipes")

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})

	def test_get_path_traversal_craft_returns_not_found(self):
		status, _, payload = self.request_json("GET", "/api/crafts/..%2Fcooking/recipes")

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})

	def test_get_unknown_path_returns_not_found(self):
		status, _, payload = self.request_json("GET", "/api/unknown")

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})

	def test_put_recipe_updates_file(self):
		recipe = {"id": "cooking-002", "name": "追加レシピ", "items": []}

		status, headers, payload = self.request_json("PUT", "/api/crafts/cooking/recipes/cooking-002", recipe)

		self.assertEqual(status, 200)
		self.assertEqual(payload, {"craftId": "cooking", "recipe": recipe})
		self.assert_common_success_headers(headers)
		self.assertEqual(self.api.read_json(self.recipe_path)[-1], recipe)

	def test_post_recipe_creates_server_assigned_id(self):
		status, headers, payload = self.request_json(
			"POST", "/api/crafts/cooking/recipes", {"name": "追加レシピ", "items": []}
		)

		recipe = {"id": "db-cooking-1", "name": "追加レシピ", "items": []}
		self.assertEqual(status, 201)
		self.assertEqual(payload, {"craftId": "cooking", "recipe": recipe})
		self.assert_common_success_headers(headers)
		self.assertEqual(self.api.read_json(self.recipe_path)[-1], recipe)

	def test_post_recipe_rejects_client_assigned_id(self):
		status, _, payload = self.request_json(
			"POST", "/api/crafts/cooking/recipes",
			{"id": "client-id", "name": "追加レシピ", "items": []},
		)

		self.assertEqual(status, 400)
		self.assertEqual(payload, {"error": "recipe_id_not_allowed"})

	def test_post_unknown_craft_returns_not_found(self):
		status, _, payload = self.request_json(
			"POST", "/api/crafts/unknown/recipes", {"name": "追加レシピ", "items": []}
		)

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})

	def test_post_invalid_json_returns_bad_request(self):
		status, _, body = self.request("POST", "/api/crafts/cooking/recipes", b"{")

		self.assertEqual(status, 400)
		self.assertEqual(json.loads(body), {"error": "invalid_json"})

	def test_post_path_with_recipe_id_returns_not_found(self):
		status, _, payload = self.request_json(
			"POST", "/api/crafts/cooking/recipes/recipe-001", {"name": "追加レシピ", "items": []}
		)

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})

	def test_put_recipe_id_mismatch_returns_bad_request(self):
		status, _, payload = self.request_json(
			"PUT",
			"/api/crafts/cooking/recipes/cooking-002",
			{"id": "cooking-003", "name": "追加レシピ", "items": []},
		)

		self.assertEqual(status, 400)
		self.assertEqual(payload, {"error": "recipe_id_mismatch"})

	def test_put_non_list_items_returns_bad_request(self):
		status, _, payload = self.request_json(
			"PUT",
			"/api/crafts/cooking/recipes/cooking-002",
			{"id": "cooking-002", "name": "追加レシピ", "items": {}},
		)

		self.assertEqual(status, 400)
		self.assertEqual(payload, {"error": "invalid_recipe_items"})

	def test_put_empty_name_returns_bad_request(self):
		status, _, payload = self.request_json(
			"PUT",
			"/api/crafts/cooking/recipes/cooking-002",
			{"id": "cooking-002", "name": "", "items": []},
		)

		self.assertEqual(status, 400)
		self.assertEqual(payload, {"error": "invalid_recipe_name"})

	def test_put_invalid_json_returns_decoder_error(self):
		"""現行はJSONDecodeErrorがValueErrorとして先に捕捉され、パーサーの文言が返る。

		文言はPythonの実装依存で変わるため、ステータスとerrorキーの存在だけを固定する。
		"""
		status, _, payload = self.request("PUT", "/api/crafts/cooking/recipes/cooking-002", b"{")

		self.assertEqual(status, 400)
		self.assertIsInstance(json.loads(payload).get("error"), str)

	def test_put_unknown_craft_returns_not_found(self):
		status, _, payload = self.request_json(
			"PUT",
			"/api/crafts/unknown/recipes/recipe-001",
			{"id": "recipe-001", "name": "追加レシピ", "items": []},
		)

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})

	def test_put_path_without_recipe_id_returns_not_found(self):
		status, _, payload = self.request_json("PUT", "/api/crafts/cooking/recipes", {})

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})

	def test_delete_recipe_removes_file_entry(self):
		status, headers, payload = self.request_json("DELETE", "/api/crafts/cooking/recipes/cooking-001")

		self.assertEqual(status, 200)
		self.assertEqual(payload, {"craftId": "cooking", "deletedId": "cooking-001"})
		self.assert_common_success_headers(headers)
		self.assertEqual(self.api.read_json(self.recipe_path), [])

	def test_delete_unknown_craft_returns_not_found(self):
		status, _, payload = self.request_json("DELETE", "/api/crafts/unknown/recipes/recipe-001")

		self.assertEqual(status, 404)
		self.assertEqual(payload, {"error": "not_found"})

	def test_options_returns_cors_headers(self):
		status, headers, body = self.request("OPTIONS", "/any-path")

		self.assertEqual(status, 204)
		self.assertEqual(body, b"")
		self.assertEqual(headers["Access-Control-Allow-Origin"], "*")
		self.assertEqual(headers["Access-Control-Allow-Methods"], "GET, POST, PUT, DELETE, OPTIONS")
		self.assertEqual(headers["Access-Control-Allow-Headers"], "Content-Type")


if __name__ == "__main__":
	unittest.main()
