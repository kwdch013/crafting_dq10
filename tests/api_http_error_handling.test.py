"""HTTPハンドラが想定外の例外でもJSONエラーを返すことを確認する。"""

import importlib.util
import json
import sys
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))


def load_script(path, name):
	"""パッケージ配下ではないスクリプトをファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(name, path)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


class UnexpectedErrorStore:
	"""ハンドラの最後の例外処理を検証するため、常に例外を送出します。"""

	def load_all(self):
		raise RuntimeError("テスト用の内部例外")

	def upsert(self, craft_id, recipe):
		raise RuntimeError("テスト用の内部例外")

	def delete(self, craft_id, recipe_id):
		raise RuntimeError("テスト用の内部例外")


class ApiHttpErrorHandlingTest(unittest.TestCase):
	"""ストア起因の予期しない例外をHTTP 500へ変換する。"""

	def setUp(self):
		self.api = load_script(REPO_ROOT / "api" / "main.py", "dq10_http_error_main")
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

	def test_store_exceptions_return_internal_error_for_get_put_and_delete(self):
		requests = [
			("GET", "/api/recipes", None),
			("PUT", "/api/crafts/cooking/recipes/error-recipe", {
				"id": "error-recipe", "name": "例外確認", "items": [],
			}),
			("DELETE", "/api/crafts/cooking/recipes/error-recipe", None),
		]

		with patch.object(self.api, "create_store", return_value=UnexpectedErrorStore()):
			for method, path, payload in requests:
				with self.subTest(method=method):
					status, body = self.request(method, path, payload)

					self.assertEqual(status, 500)
					self.assertEqual(body, {"error": "internal_error"})
					self.assertNotIn("テスト用の内部例外", json.dumps(body, ensure_ascii=False))

	def request(self, method, path, payload):
		"""HTTPリクエストを送り、エラー応答もJSONへ復元します。"""
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


if __name__ == "__main__":
	unittest.main()
