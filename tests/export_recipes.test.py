"""DBからのレシピファイル出力を検証します。"""

import contextlib
import importlib.util
import io
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
# compose が api コンテナへホストの app をマウントする位置。WORKDIR の /usr/src/app とは分ける
CONTAINER_APP_DIR = "/usr/src/frontend-app"
# 書き込み対象は app/crafts のみのため、composeではその配下だけをマウントする
CONTAINER_CRAFTS_DIR = f"{CONTAINER_APP_DIR}/crafts"


def load_script(path, name):
	"""パッケージ配下ではないスクリプトをファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(name, path)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


def api_service_block(compose: str) -> str:
	"""docker-compose.yml から api サービスの定義部分だけを取り出します。"""
	lines = compose.splitlines()
	start = lines.index("  api:") + 1
	end = start
	while end < len(lines) and (not lines[end].strip() or lines[end].startswith("    ")):
		end += 1
	return "\n".join(lines[start:end])


def dockerfile_workdir(path: Path) -> str:
	"""Dockerfile の WORKDIR を読み取り、マウント先との衝突判定に使います。"""
	for line in path.read_text(encoding="utf-8").splitlines():
		if line.startswith("WORKDIR "):
			return line.removeprefix("WORKDIR ").strip()
	return ""


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

	def export_via_environment(self, *extra_args):
		"""コンテナ内実行と同じく、出力先を環境変数 APP_DIR だけで与えます。"""
		original = os.environ.get("APP_DIR")
		os.environ["APP_DIR"] = str(self.app_dir)
		try:
			return self.exporter.main([
				"--database-url", TEST_DATABASE_URL,
				"--data-dir", str(self.data_dir),
				*extra_args,
			])
		finally:
			if original is None:
				os.environ.pop("APP_DIR", None)
			else:
				os.environ["APP_DIR"] = original

	def test_app_dir_environment_variable_updates_existing_recipes_js(self):
		"""#249: --app-dir 無しでも APP_DIR の既存 recipes.js を更新します。"""
		self.assertEqual(self.export_via_environment(), 0)
		path = self.app_dir / "crafts" / "cooking" / "recipes.js"
		expected = path.read_bytes()
		path.write_text("// 変更済み\n", encoding="utf-8")
		self.assertEqual(self.export_via_environment("--craft", "cooking"), 0)
		self.assertEqual(path.read_bytes(), expected)

	def test_dry_run_detects_difference_against_existing_recipes_js(self):
		"""#249: --dry-run が既存 recipes.js との差分を判定し、書き換えません。"""
		self.assertEqual(self.export_via_environment(), 0)
		path = self.app_dir / "crafts" / "cooking" / "recipes.js"
		modified = "// 変更済み\n"
		path.write_text(modified, encoding="utf-8")
		output = io.StringIO()
		with contextlib.redirect_stdout(output):
			self.assertEqual(self.export_via_environment("--craft", "cooking", "--dry-run"), 0)
		self.assertIn(f"変更: {path}", output.getvalue())
		self.assertEqual(path.read_text(encoding="utf-8"), modified)

		# 差分が無い状態では「変更なし」と判定します
		self.assertEqual(self.export_via_environment("--craft", "cooking"), 0)
		output = io.StringIO()
		with contextlib.redirect_stdout(output):
			self.assertEqual(self.export_via_environment("--craft", "cooking", "--dry-run"), 0)
		self.assertIn(f"変更なし: {path}", output.getvalue())


class AppDirResolutionTest(unittest.TestCase):
	"""コンテナ内実行でもホストの app へ出力できる解決順序かを検証します。"""

	def setUp(self):
		self.exporter = load_script(REPO_ROOT / "api" / "scripts" / "export_recipes.py", "dq10_export_recipes_app_dir")
		self.original_app_dir = os.environ.get("APP_DIR")

	def tearDown(self):
		if self.original_app_dir is None:
			os.environ.pop("APP_DIR", None)
		else:
			os.environ["APP_DIR"] = self.original_app_dir

	def test_falls_back_to_repository_app_directory(self):
		os.environ.pop("APP_DIR", None)
		self.assertEqual(self.exporter.resolve_app_dir(None), REPO_ROOT / "app")

	def test_uses_app_dir_environment_variable(self):
		os.environ["APP_DIR"] = CONTAINER_APP_DIR
		self.assertEqual(self.exporter.resolve_app_dir(None), Path(CONTAINER_APP_DIR))

	def test_command_line_option_takes_precedence_over_environment(self):
		os.environ["APP_DIR"] = CONTAINER_APP_DIR
		self.assertEqual(self.exporter.resolve_app_dir("/tmp/export-check"), Path("/tmp/export-check"))

	def test_blank_environment_variable_is_ignored(self):
		os.environ["APP_DIR"] = "   "
		self.assertEqual(self.exporter.resolve_app_dir(None), REPO_ROOT / "app")

	def test_blank_command_line_option_is_rejected(self):
		# 空文字を許すとカレントディレクトリへ書き出してしまうため、明示的に落とします
		os.environ["APP_DIR"] = CONTAINER_APP_DIR
		with self.assertRaises(SystemExit):
			self.exporter.resolve_app_dir("")
		with self.assertRaises(SystemExit):
			self.exporter.resolve_app_dir("   ")


class ComposeAppMountTest(unittest.TestCase):
	"""コンテナからホストの recipes.js を更新できる compose 設定かを検証します。"""

	def setUp(self):
		compose = (REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")
		self.api_service = api_service_block(compose)
		self.workdir = dockerfile_workdir(REPO_ROOT / "api" / "Dockerfile")

	def test_api_service_mounts_repository_crafts_directory(self):
		self.assertIn(f"- ./app/crafts:{CONTAINER_CRAFTS_DIR}", self.api_service)

	def test_api_service_passes_app_dir_to_container(self):
		self.assertIn(f"APP_DIR: {CONTAINER_APP_DIR}", self.api_service)

	def test_mount_target_matches_app_dir_layout(self):
		# export_recipes.py は app_dir/crafts/<職人> へ書き出すため、両者がずれてはいけない
		self.assertEqual(CONTAINER_CRAFTS_DIR, f"{CONTAINER_APP_DIR}/crafts")

	def test_container_app_dir_does_not_collide_with_workdir(self):
		# WORKDIR は api/ の配置先。ここへ重ねるとAPIのソースが隠れて起動できなくなる
		self.assertTrue(self.workdir)
		self.assertNotEqual(CONTAINER_APP_DIR, self.workdir)
		self.assertFalse(CONTAINER_APP_DIR.startswith(self.workdir.rstrip("/") + "/"))


if __name__ == "__main__":
	unittest.main()
