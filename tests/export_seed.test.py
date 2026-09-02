"""DBからのシードSQL出力を検証します。"""

import importlib.util
import os
import re
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")
DATA_DIR = REPO_ROOT / "api" / "data"
MIGRATION_DIR = REPO_ROOT / "api" / "migrations"
SEED_PATH = MIGRATION_DIR / "0004_seed_recipes.sql"


def load_script(path, name):
	"""パッケージ配下ではないスクリプトをファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(name, path)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class ExportSeedTest(unittest.TestCase):
	"""テストDBのpublicスキーマを毎回作り直してシードを検証します。"""

	def setUp(self):
		import psycopg

		self.apply = load_script(MIGRATION_DIR / "apply.py", "dq10_export_seed_apply")
		self.importer = load_script(REPO_ROOT / "api" / "scripts" / "import_recipes.py", "dq10_export_seed_import")
		self.exporter = load_script(REPO_ROOT / "api" / "scripts" / "export_seed.py", "dq10_export_seed")
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		self.temporary_directory = tempfile.TemporaryDirectory()
		self.output_path = Path(self.temporary_directory.name) / "0004_seed_recipes.sql"
		self.reset_and_import()

	def tearDown(self):
		self.conn.close()
		self.temporary_directory.cleanup()

	def reset_and_import(self):
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply.ensure_schema_migration(self.conn)
		for name in ("0001_init.sql", "0002_recipes.sql", "0003_seed_master.sql"):
			self.apply.apply_migration(self.conn, MIGRATION_DIR / name)
		self.importer.import_all(self.conn, DATA_DIR)

	def export_seed(self, *extra_args):
		return self.exporter.main([
			"--database-url", TEST_DATABASE_URL,
			"--output", str(self.output_path),
			*extra_args,
		])

	def seed_statements(self, sql_text):
		"""生成SQLからINSERT文だけを出現順で取り出します。"""
		return re.findall(r"(?m)^INSERT INTO .+;$", sql_text)

	def assert_seed_structure(self, sql_text):
		"""分類、見出し、職人別レシピの出力順とID解決方法を検証します。"""
		from repository import mapping

		statements = self.seed_statements(sql_text)
		master_pattern = re.compile(
			r"VALUES \('(?P<legacy_id>(?:''|[^'])*)', '(?:''|[^'])*', (?P<class_id>\d+), "
		)
		statement_index = 0
		for craft_id, class_id in mapping.CRAFT_CLASSES.items():
			category_table = mapping.category_table(craft_id)
			recipe_table = mapping.recipe_table(craft_id)
			category_pattern = re.compile(rf'INSERT INTO "?{category_table}"? ')
			recipe_pattern = re.compile(rf'INSERT INTO "?{recipe_table}"? ')

			category_start = statement_index
			while statement_index < len(statements) and category_pattern.match(statements[statement_index]):
				statement_index += 1
			self.assertGreater(
				statement_index,
				category_start,
				f"{craft_id} の分類INSERTが先頭にありません",
			)

			recipe_count = 0
			while statement_index < len(statements):
				master_match = master_pattern.search(statements[statement_index])
				if master_match is None:
					break
				self.assertEqual(int(master_match.group("class_id")), class_id)
				self.assertLess(statement_index + 1, len(statements))
				legacy_id = master_match.group("legacy_id")
				self.assertRegex(statements[statement_index + 1], recipe_pattern)
				self.assertIn(
					f"VALUES ((SELECT id FROM craft_master WHERE legacy_id = '{legacy_id}')",
					statements[statement_index + 1],
				)
				statement_index += 2
				recipe_count += 1
			self.assertGreater(recipe_count, 0, f"{craft_id} のレシピINSERTがありません")

		self.assertEqual(statement_index, len(statements))

	def test_generated_seed_initializes_empty_schema_and_round_trips(self):
		from repository import queries

		expected = queries.load_all_recipes(self.conn)
		self.assertEqual(self.export_seed(), 0)
		sql_text = self.output_path.read_text(encoding="utf-8")
		self.assertEqual(sql_text.splitlines()[:5], SEED_PATH.read_text(encoding="utf-8").splitlines()[:5])
		self.assertIsNone(re.search(r"(?m)^(?:BEGIN|COMMIT);", sql_text))
		self.conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply.ensure_schema_migration(self.conn)
		for name in ("0001_init.sql", "0002_recipes.sql", "0003_seed_master.sql"):
			self.apply.apply_migration(self.conn, MIGRATION_DIR / name)
		self.conn.execute(sql_text)
		self.conn.commit()
		self.assertEqual(self.conn.execute("SELECT count(*) FROM craft_master").fetchone()[0], 70)
		self.assertEqual(queries.load_all_recipes(self.conn), expected)

	def test_generated_seed_has_required_statement_structure(self):
		self.assert_seed_structure(SEED_PATH.read_text(encoding="utf-8"))
		self.assertEqual(self.export_seed(), 0)
		sql_text = self.output_path.read_text(encoding="utf-8")
		self.assert_seed_structure(sql_text)

		statements = self.seed_statements(sql_text)
		first_category = next(
			statement for statement in statements if re.match(r'INSERT INTO "?\w+_category"? ', statement)
		)
		first_master = next(statement for statement in statements if re.match(r'INSERT INTO "?craft_master"? ', statement))
		broken_category_order = sql_text.replace(
			first_category + "\n", "", 1
		).replace(first_master + "\n", first_master + "\n" + first_category + "\n", 1)
		with self.assertRaises(AssertionError):
			self.assert_seed_structure(broken_category_order)

		first_recipe = statements[statements.index(first_master) + 1]
		broken_recipe_order = sql_text.replace(
			first_master + "\n" + first_recipe,
			first_recipe + "\n" + first_master,
			1,
		)
		with self.assertRaises(AssertionError):
			self.assert_seed_structure(broken_recipe_order)

		broken_id_resolution = re.sub(
			r"\(SELECT id FROM craft_master WHERE legacy_id = '[^']+'\)", "1", sql_text, count=1
		)
		with self.assertRaises(AssertionError):
			self.assert_seed_structure(broken_id_resolution)

	def test_escapes_recipe_name_and_dry_run_does_not_write(self):
		from repository.postgres_store import PostgresRecipeStore

		recipe = PostgresRecipeStore(TEST_DATABASE_URL).load_craft("cooking")[0]
		recipe.update({"id": "seed-quote", "name": "テスト'料理"})
		PostgresRecipeStore(TEST_DATABASE_URL).upsert("cooking", recipe)
		self.assertEqual(self.export_seed(), 0)
		sql_text = self.output_path.read_text(encoding="utf-8")
		self.assertIn("テスト''料理", sql_text)
		before = self.output_path.read_bytes()
		self.conn.execute("UPDATE craft_master SET name = %s WHERE legacy_id = %s", ("別名", "seed-quote"))
		self.conn.commit()
		self.assertEqual(self.export_seed("--dry-run"), 0)
		self.assertEqual(self.output_path.read_bytes(), before)
		self.conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply.ensure_schema_migration(self.conn)
		for name in ("0001_init.sql", "0002_recipes.sql", "0003_seed_master.sql"):
			self.apply.apply_migration(self.conn, MIGRATION_DIR / name)
		self.conn.execute(sql_text)
		self.conn.commit()
		self.assertEqual(
			self.conn.execute("SELECT name FROM craft_master WHERE legacy_id = %s", ("seed-quote",)).fetchone()[0],
			"テスト'料理",
		)

	def test_escapes_category_name_when_seed_is_applied(self):
		category_name = "テスト'分類\\確認"
		self.conn.execute(
			"UPDATE cooking_category SET category_name = %s WHERE category_id = 1",
			(category_name,),
		)
		self.conn.commit()
		self.assertEqual(self.export_seed(), 0)
		sql_text = self.output_path.read_text(encoding="utf-8")
		self.assertIn("テスト''分類", sql_text)
		self.conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply.ensure_schema_migration(self.conn)
		for name in ("0001_init.sql", "0002_recipes.sql", "0003_seed_master.sql"):
			self.apply.apply_migration(self.conn, MIGRATION_DIR / name)
		self.conn.execute(sql_text)
		self.conn.commit()
		self.assertEqual(
			self.conn.execute("SELECT category_name FROM cooking_category WHERE category_id = 1").fetchone()[0],
			category_name,
		)


if __name__ == "__main__":
	unittest.main()
