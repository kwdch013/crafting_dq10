from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
import json
import os
import sys


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

# 既存テストはmain.pyをパス指定で読み込むため、api配下もモジュール探索対象にします。
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))

from repository import create_store, json_store


def read_json(path):
	"""既存テストとの互換性のため、JSON読込ヘルパを公開する。"""
	return json_store.read_json(path)


# 既存テストがmain.DATA_DIRを差し替えてから呼ぶため、読込時にストアを固定しません。
def get_recipe_path(craft_id):
	"""既存テストとの互換性のため、レシピパス解決を委譲する。"""
	return json_store.JsonRecipeStore(DATA_DIR).recipe_path(craft_id)


def upsert_recipe(craft_id, recipe):
	"""既存テストとの互換性のため、レシピ保存を委譲する。"""
	return json_store.JsonRecipeStore(DATA_DIR).upsert(craft_id, recipe)


def delete_recipe(craft_id, recipe_id):
	"""既存テストとの互換性のため、レシピ削除を委譲する。"""
	return json_store.JsonRecipeStore(DATA_DIR).delete(craft_id, recipe_id)


def response_payload(path):
	if path == "/health":
		return {"status": "ok"}

	if path == "/api/crafts":
		return json_store.read_json(DATA_DIR / "catalog.json")

	if path == "/api/recipes":
		return {"crafts": create_store(DATA_DIR).load_all()}

	prefix = "/api/crafts/"
	if path.startswith(prefix) and path.endswith("/recipes"):
		craft_id = unquote(path[len(prefix):-len("/recipes")]).strip("/")
		try:
			return {"craftId": craft_id, "recipes": create_store(DATA_DIR).load_craft(craft_id)}
		except (FileNotFoundError, ValueError):
			return None

	return None


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        payload = response_payload(parsed.path)

        if payload is None:
            self.send_json({"error": "not_found"}, status=404)
            return

        self.send_json(payload)

    # レシピ追加・編集をrecipes.jsonへ反映します。
    def do_PUT(self):
        parsed = urlparse(self.path)
        prefix = "/api/crafts/"
        suffix = "/recipes/"

        if not parsed.path.startswith(prefix) or suffix not in parsed.path:
            self.send_json({"error": "not_found"}, status=404)
            return

        craft_id, recipe_id = parsed.path[len(prefix):].split(suffix, 1)
        craft_id = unquote(craft_id).strip("/")
        recipe_id = unquote(recipe_id).strip("/")

        try:
            recipe = self.read_request_json()
            if not isinstance(recipe, dict):
                raise ValueError("invalid_recipe")
            if recipe.get("id") != recipe_id:
                self.send_json({"error": "recipe_id_mismatch"}, status=400)
                return
            self.send_json(upsert_recipe(craft_id, recipe))
        except FileNotFoundError:
            self.send_json({"error": "not_found"}, status=404)
        except ValueError as error:
            self.send_json({"error": str(error)}, status=400)
        except json.JSONDecodeError:
            self.send_json({"error": "invalid_json"}, status=400)

    # レシピ削除をrecipes.jsonへ反映します。
    def do_DELETE(self):
        parsed = urlparse(self.path)
        prefix = "/api/crafts/"
        suffix = "/recipes/"

        if not parsed.path.startswith(prefix) or suffix not in parsed.path:
            self.send_json({"error": "not_found"}, status=404)
            return

        craft_id, recipe_id = parsed.path[len(prefix):].split(suffix, 1)
        craft_id = unquote(craft_id).strip("/")
        recipe_id = unquote(recipe_id).strip("/")

        try:
            self.send_json(delete_recipe(craft_id, recipe_id))
        except FileNotFoundError:
            self.send_json({"error": "not_found"}, status=404)
        except ValueError as error:
            self.send_json({"error": str(error)}, status=400)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    # リクエスト本文のJSONを読み込みます。
    def read_request_json(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length).decode("utf-8")
        return json.loads(body)

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args))


def main():
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"api listening on {port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
