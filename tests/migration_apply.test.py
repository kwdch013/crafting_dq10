"""マイグレーション適用スクリプトのテスト

DB不要の単体テストと、TEST_DATABASE_URL がある場合のみ動く結合テストを持ちます。
CI ではDBに接続できないため、結合テストはスキップされます。
"""

import importlib.util
import os
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MIGRATION_DIR = REPO_ROOT / "api" / "migrations"
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")


def load_apply_module():
	"""apply.py はパッケージ配下ではないためファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(
		"dq10_migration_apply", MIGRATION_DIR / "apply.py"
	)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


class MigrationFileTest(unittest.TestCase):
	"""ファイル走査と未適用判定 (DB不要)"""

	def setUp(self):
		self.apply = load_apply_module()

	def test_migration_files_are_sorted_by_name(self):
		with tempfile.TemporaryDirectory() as name:
			directory = Path(name)
			for stem in ("0010_late", "0002_second", "0001_first"):
				(directory / f"{stem}.sql").write_text("SELECT 1;", encoding="utf-8")
			(directory / "apply.py").write_text("", encoding="utf-8")
			files = self.apply.migration_files(directory)
			self.assertEqual(
				[path.name for path in files],
				["0001_first.sql", "0002_second.sql", "0010_late.sql"],
			)

	def test_version_is_file_stem(self):
		self.assertEqual(self.apply.migration_version(Path("/x/0001_init.sql")), "0001_init")

	def test_pending_excludes_applied_versions(self):
		with tempfile.TemporaryDirectory() as name:
			directory = Path(name)
			for stem in ("0001_first", "0002_second"):
				(directory / f"{stem}.sql").write_text("SELECT 1;", encoding="utf-8")
			pending = self.apply.pending_migrations({"0001_first"}, directory)
			self.assertEqual([path.name for path in pending], ["0002_second.sql"])

	def test_repository_migrations_are_found(self):
		files = self.apply.migration_files()
		self.assertEqual(
			[path.name for path in files],
			[
				"0001_init.sql",
				"0002_recipes.sql",
				"0003_seed_master.sql",
				"0004_seed_recipes.sql",
			],
		)


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class MigrationApplyTest(unittest.TestCase):
	"""空のDBへの適用と再適用 (DB必要)"""

	def setUp(self):
		import psycopg

		self.apply = load_apply_module()
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		# 前回の実行結果を残さないため、毎回スキーマごと作り直します。
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()

	def tearDown(self):
		self.conn.close()

	def count(self, table):
		return self.conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]

	def test_apply_all_creates_schema_and_seed(self):
		applied = self.apply.apply_all(self.conn)
		self.assertEqual(
			applied,
			["0001_init", "0002_recipes", "0003_seed_master", "0004_seed_recipes"],
		)
		self.assertEqual(self.count("craft_master"), 70)
		self.assertEqual(self.count("schema_migration"), 4)

	def test_apply_all_is_idempotent(self):
		self.apply.apply_all(self.conn)
		self.assertEqual(self.apply.apply_all(self.conn), [])
		self.assertEqual(self.count("craft_master"), 70)
		self.assertEqual(self.count("schema_migration"), 4)

	def test_failed_migration_is_not_recorded(self):
		"""途中で失敗したSQLは適用済みに記録しません。"""
		import psycopg

		self.apply.ensure_schema_migration(self.conn)
		with tempfile.TemporaryDirectory() as name:
			directory = Path(name)
			(directory / "9999_broken.sql").write_text("SELECT 1 FROM missing_table;", encoding="utf-8")
			with self.assertRaises(psycopg.Error):
				self.apply.apply_all(self.conn, directory)
		self.assertEqual(self.count("schema_migration"), 0)


if __name__ == "__main__":
	unittest.main()
