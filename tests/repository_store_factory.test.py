"""レシピストア選択ファクトリのテスト。"""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

from repository import create_store
from repository.json_store import JsonRecipeStore
from repository.postgres_store import PostgresRecipeStore


class RecipeStoreFactoryTest(unittest.TestCase):
	"""環境変数に応じて保存先を選べることを確認する。"""

	def test_defaults_to_json_when_recipe_store_is_unset(self):
		with patch.dict(os.environ, {}, clear=True):
			store = create_store(Path("test-data"))

		self.assertIsInstance(store, JsonRecipeStore)

	def test_creates_json_store_when_recipe_store_is_json(self):
		with patch.dict(os.environ, {"RECIPE_STORE": "json"}, clear=False):
			store = create_store(Path("test-data"))

		self.assertIsInstance(store, JsonRecipeStore)

	def test_creates_postgres_store_without_connecting(self):
		with patch.dict(
			os.environ,
			{"RECIPE_STORE": "postgres", "DATABASE_URL": "postgresql://example/test"},
			clear=False,
		):
			store = create_store(Path("test-data"))

		self.assertIsInstance(store, PostgresRecipeStore)
		self.assertEqual(store.database_url, "postgresql://example/test")

	def test_rejects_unknown_store_name(self):
		with self.assertRaisesRegex(ValueError, "invalid") as context:
			create_store(Path("test-data"), store_name="invalid")

		self.assertIn("json", str(context.exception))
		self.assertIn("postgres", str(context.exception))

	def test_rejects_empty_database_url_for_postgres(self):
		with patch.dict(os.environ, {"DATABASE_URL": ""}, clear=False):
			with self.assertRaisesRegex(ValueError, "DATABASE_URL"):
				create_store(Path("test-data"), store_name="postgres")


if __name__ == "__main__":
	unittest.main()
