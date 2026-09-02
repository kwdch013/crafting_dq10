"""現行JSON → DB → 復元 のラウンドトリップテスト

移行の妥当性判定の基準です。値の差分が出た場合は移行を進めません。
TEST_DATABASE_URL がある場合のみ実行し、CI ではスキップされます。

比較は docs/design/12-recipe-db-conversion.md「エクスポート時に再生成する項目」を
両側で揃えたうえで、キー順序を無視した値の一致で行います。
"""

import importlib.util
import json
import os
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")
DATA_DIR = REPO_ROOT / "api" / "data"
MIGRATION_DIR = REPO_ROOT / "api" / "migrations"

# 現行データの総マス数。投入漏れを検知するための固定値です。
TOTAL_CELLS = 303

CRAFT_IDS = ["cooking", "weapon-smithing", "armor-smithing", "tool-smithing", "sewing", "woodworking"]
SMITHING_CRAFTS = ("tool-smithing", "weapon-smithing", "armor-smithing")


def load_script(path, name):
	"""パッケージ配下ではないスクリプトをファイル指定で読み込みます。"""
	spec = importlib.util.spec_from_file_location(name, path)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


def original_recipes(craft_id):
	return json.loads((DATA_DIR / "crafts" / craft_id / "recipes.json").read_text(encoding="utf-8"))


def normalize(recipe, craft_id):
	"""現行JSONを、DBから復元した形式と比較できる形へ揃えます。"""
	normalized = {"id": recipe["id"], "name": recipe["name"]}
	# 空文字の分類は「分類なし」を表すため、キーごと落とします。
	if recipe.get("category") and recipe.get("categoryId"):
		normalized["category"] = recipe["category"]
		normalized["categoryId"] = recipe["categoryId"]
	normalized["items"] = [
		normalize_item(item, craft_id, groups)
		for groups in [{}]
		for item in sorted(recipe["items"], key=lambda i: (i["gridCell"]["row"], i["gridCell"]["column"]))
	]
	for index, item in enumerate(normalized["items"], start=1):
		item["id"] = f"part-{index}"
	if recipe.get("traitId") and recipe["traitId"] != "none":
		normalized["traitId"] = recipe["traitId"]
	if recipe.get("archived"):
		normalized["archived"] = True
	return normalized


def normalize_item(item, craft_id, groups):
	"""マスIDと食材グループ番号を再生成し、鍛冶の欠落した基準値を補います。"""
	normalized = dict(item)
	normalized["id"] = None
	if craft_id in SMITHING_CRAFTS:
		normalized["target"] = -((-(item["successMin"] + item["successMax"])) // 2)
	group_id = item.get("ingredientGroupId")
	if group_id is not None:
		normalized["ingredientGroupId"] = f"group-{groups.setdefault(group_id, len(groups) + 1)}"
	return normalized


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL が未設定のためスキップします")
class RoundTripTestBase(unittest.TestCase):
	"""マイグレーション適用の方法だけが異なる2通りの初期化を共有します。"""

	#: 0004_seed_recipes.sql まで適用するか (False なら投入スクリプトを使う)
	use_seed = False

	def setUp(self):
		import psycopg

		self.apply = load_script(MIGRATION_DIR / "apply.py", "dq10_migration_apply")
		self.importer = load_script(REPO_ROOT / "api" / "scripts" / "import_recipes.py", "dq10_import_recipes")
		self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=False)
		self.conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
		self.conn.commit()
		self.apply_migrations()

	def tearDown(self):
		self.conn.close()

	def apply_migrations(self):
		raise NotImplementedError

	def assertCraftRoundTrips(self, craft_id):
		from repository import queries

		restored = queries.load_recipes(self.conn, craft_id)
		expected = [normalize(recipe, craft_id) for recipe in original_recipes(craft_id)]
		self.assertEqual(len(restored), len(expected), f"{craft_id} の件数が一致しません")
		for actual, want in zip(restored, expected):
			self.assertEqual(actual, want, f"{craft_id}/{want['id']} が一致しません")


class ImportRoundTripTest(RoundTripTestBase):
	"""投入スクリプト経由 (JSON → DB → 復元)"""

	def apply_migrations(self):
		# シードは投入スクリプトの検証を兼ねるため適用しません。
		self.apply.ensure_schema_migration(self.conn)
		for name in ("0001_init.sql", "0002_recipes.sql", "0003_seed_master.sql"):
			self.apply.apply_migration(self.conn, MIGRATION_DIR / name)
		self.importer.import_all(self.conn, DATA_DIR)

	def test_all_crafts_round_trip(self):
		for craft_id in CRAFT_IDS:
			with self.subTest(craft=craft_id):
				self.assertCraftRoundTrips(craft_id)

	def test_total_cell_count(self):
		from repository import queries

		total = sum(
			len(recipe["items"])
			for craft_id in CRAFT_IDS
			for recipe in queries.load_recipes(self.conn, craft_id)
		)
		self.assertEqual(total, TOTAL_CELLS)

	def test_import_is_idempotent(self):
		before = self.conn.execute("SELECT count(*) FROM craft_master").fetchone()[0]
		self.importer.import_all(self.conn, DATA_DIR)
		after = self.conn.execute("SELECT count(*) FROM craft_master").fetchone()[0]
		self.assertEqual((before, after), (70, 70))
		for craft_id in CRAFT_IDS:
			with self.subTest(craft=craft_id):
				self.assertCraftRoundTrips(craft_id)


class SeedRoundTripTest(RoundTripTestBase):
	"""シードSQL経由 (0004_seed_recipes.sql → 復元)

	コミット済みのシードが現行JSONと同じ内容であることを保証します。
	"""

	def apply_migrations(self):
		self.apply.apply_all(self.conn)

	def test_all_crafts_round_trip(self):
		for craft_id in CRAFT_IDS:
			with self.subTest(craft=craft_id):
				self.assertCraftRoundTrips(craft_id)


if __name__ == "__main__":
	unittest.main()
