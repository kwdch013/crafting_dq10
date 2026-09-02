"""DBからのレシピファイル出力を検証します。"""

import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

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


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class ExportRecipesTest(unittest.TestCase):
	"""一時ディレクトリだけを出力先にしてエクスポートを検証します。"""

	def setUp(self):
		import psycopg

		self.apply = load_script(MIGRATION_DIR / "apply.py", "dq10_export_recipes_apply")
		self.exporter = load_script(REPO_ROOT / "api" / "scripts" / "export_recipes.py", "dq10_export_recipes")
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply.apply_all(self.conn)
		self.temporary_directory = tempfile.TemporaryDirectory()
		self.data_dir = Path(self.temporary_directory.name) / "data"
		self.app_dir = Path(self.temporary_directory.name) / "app"

	def tearDown(self):
		self.conn.close()
		self.temporary_directory.cleanup()

	def export_all(self, *extra_args):
		return self.exporter.main([
			"--database-url", TEST_DATABASE_URL,
			"--data-dir", str(self.data_dir),
			"--app-dir", str(self.app_dir),
			*extra_args,
		])

	def test_round_trip_format_and_javascript(self):
		from repository.postgres_store import PostgresRecipeStore

		self.assertEqual(self.export_all(), 0)
		expected = PostgresRecipeStore(TEST_DATABASE_URL).load_all()
		for craft_id, recipes in expected.items():
			with self.subTest(craft=craft_id):
				json_path = self.data_dir / "crafts" / craft_id / "recipes.json"
				js_path = self.app_dir / "crafts" / craft_id / "recipes.js"
				json_text = json_path.read_text(encoding="utf-8")
				self.assertEqual(json.loads(json_text), recipes)
				self.assertEqual(json_text, json.dumps(recipes, ensure_ascii=False, indent=2) + "\n")
				js_text = js_path.read_text(encoding="utf-8")
				prefix = f'registerDQ10CraftRecipes("{craft_id}", '
				self.assertTrue(js_text.startswith(prefix))
				self.assertTrue(js_text.endswith(");\n"))
				self.assertEqual(json.loads(js_text[len(prefix):-3]), recipes)

	def test_is_idempotent_and_craft_limits_updated_files(self):
		self.assertEqual(self.export_all(), 0)
		before = {
			path: path.read_bytes()
			for craft_id in ("tool-smithing", "weapon-smithing", "armor-smithing", "sewing", "woodworking", "cooking")
			for path in (
				self.data_dir / "crafts" / craft_id / "recipes.json",
				self.app_dir / "crafts" / craft_id / "recipes.js",
			)
		}
		self.assertEqual(self.export_all(), 0)
		self.assertEqual({path: path.read_bytes() for path in before}, before)
		for path in before:
			path.write_text("[]\n", encoding="utf-8")
		self.assertEqual(self.export_all("--craft", "cooking"), 0)
		for path in before:
			with self.subTest(path=path):
				if "cooking" in path.parts:
					self.assertNotEqual(path.read_bytes(), b"[]\n")
				else:
					self.assertEqual(path.read_bytes(), b"[]\n")

	def test_dry_run_does_not_write_files(self):
		self.assertEqual(self.export_all(), 0)
		path = self.data_dir / "crafts" / "cooking" / "recipes.json"
		path.write_text("[]\n", encoding="utf-8")
		before = path.read_bytes()
		self.assertEqual(self.export_all("--dry-run"), 0)
		self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
	unittest.main()
