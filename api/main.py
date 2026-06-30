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

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

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
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
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
