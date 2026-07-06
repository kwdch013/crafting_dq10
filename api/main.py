from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
import json
import os


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"


def read_json(path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


# レシピJSONを人が差分確認しやすい整形で保存します。
def write_json(path, payload):
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)
        file.write("\n")


# 職人IDから対象recipes.jsonを解決し、パストラバーサルを防ぎます。
def get_recipe_path(craft_id):
    if not craft_id or "/" in craft_id or "\\" in craft_id or craft_id in {".", ".."}:
        raise ValueError("invalid_craft_id")

    recipe_path = DATA_DIR / "crafts" / craft_id / "recipes.json"
    if not recipe_path.exists():
        raise FileNotFoundError("recipe_file_not_found")
    return recipe_path


# APIから受け取るレシピの最低限の必須項目を検証します。
def validate_recipe(recipe):
    if not isinstance(recipe, dict):
        raise ValueError("invalid_recipe")
    recipe_id = recipe.get("id")
    name = recipe.get("name")
    items = recipe.get("items")
    if not isinstance(recipe_id, str) or not recipe_id.strip():
        raise ValueError("invalid_recipe_id")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("invalid_recipe_name")
    if not isinstance(items, list):
        raise ValueError("invalid_recipe_items")


# レシピIDをキーに追加または置換してrecipes.jsonへ反映します。
def upsert_recipe(craft_id, recipe):
    validate_recipe(recipe)
    recipe_path = get_recipe_path(craft_id)
    recipes = read_json(recipe_path)
    recipe_id = recipe["id"]
    next_recipes = [candidate for candidate in recipes if candidate.get("id") != recipe_id]
    next_recipes.append(recipe)
    write_json(recipe_path, next_recipes)
    return {"craftId": craft_id, "recipe": recipe}


# 指定レシピをrecipes.jsonから除外します。
def delete_recipe(craft_id, recipe_id):
    if not recipe_id:
        raise ValueError("invalid_recipe_id")

    recipe_path = get_recipe_path(craft_id)
    recipes = read_json(recipe_path)
    next_recipes = [recipe for recipe in recipes if recipe.get("id") != recipe_id]
    write_json(recipe_path, next_recipes)
    return {"craftId": craft_id, "deletedId": recipe_id}


def response_payload(path):
    if path == "/health":
        return {"status": "ok"}

    if path == "/api/crafts":
        return read_json(DATA_DIR / "catalog.json")

    if path == "/api/recipes":
        result = {}
        for recipe_file in sorted((DATA_DIR / "crafts").glob("*/recipes.json")):
            result[recipe_file.parent.name] = read_json(recipe_file)
        return {"crafts": result}

    prefix = "/api/crafts/"
    if path.startswith(prefix) and path.endswith("/recipes"):
        craft_id = unquote(path[len(prefix):-len("/recipes")]).strip("/")
        recipe_path = DATA_DIR / "crafts" / craft_id / "recipes.json"
        if recipe_path.exists():
            return {"craftId": craft_id, "recipes": read_json(recipe_path)}
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
