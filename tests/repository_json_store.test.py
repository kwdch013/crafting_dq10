"""JSONレシピ保存先の単体テスト。"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

from repository.json_store import JsonRecipeStore


class JsonRecipeStoreTest(unittest.TestCase):
	def setUp(self):
		self.temp_dir = tempfile.TemporaryDirectory()
		self.data_dir = Path(self.temp_dir.name)
		self.cooking_path = self.data_dir / "crafts" / "cooking" / "recipes.json"
		self.smithing_path = self.data_dir / "crafts" / "weapon-smithing" / "recipes.json"
		self.cooking_path.parent.mkdir(parents=True)
		self.smithing_path.parent.mkdir(parents=True)
		self.cooking_path.write_text(
			"""[
  {
    "id": "cooking-001",
    "name": "既存レシピ",
    "items": []
  }
]""",
			encoding="utf-8",
		)
		self.smithing_path.write_text("[]", encoding="utf-8")
		self.store = JsonRecipeStore(self.data_dir)

	def tearDown(self):
		self.temp_dir.cleanup()

	def test_load_all_returns_crafts_in_recipe_path_order(self):
		self.assertEqual(
			self.store.load_all(),
			{
				"cooking": [{"id": "cooking-001", "name": "既存レシピ", "items": []}],
				"weapon-smithing": [],
			},
		)

	def test_load_craft_returns_recipes(self):
		self.assertEqual(
			self.store.load_craft("cooking"),
			[{"id": "cooking-001", "name": "既存レシピ", "items": []}],
		)

	def test_upsert_appends_then_replaces_recipe(self):
		added_recipe = {"id": "user-cooking-1", "name": "追加レシピ", "items": []}

		self.assertEqual(
			self.store.upsert("cooking", added_recipe),
			{"craftId": "cooking", "recipe": added_recipe},
		)
		self.assertEqual(
			self.store.upsert("cooking", {"id": "cooking-001", "name": "編集後", "items": []}),
			{"craftId": "cooking", "recipe": {"id": "cooking-001", "name": "編集後", "items": []}},
		)
		self.assertEqual(
			self.store.load_craft("cooking"),
			[
				{"id": "user-cooking-1", "name": "追加レシピ", "items": []},
				{"id": "cooking-001", "name": "編集後", "items": []},
			],
		)

	def test_create_assigns_next_craft_scoped_id_and_ignores_input_id(self):
		self.cooking_path.write_text(
			json.dumps([
				{"id": "db-cooking-2", "name": "既存2", "items": []},
				{"id": "db-cooking-8", "name": "既存8", "items": []},
				{"id": "db-other-99", "name": "別職人形式", "items": []},
			], ensure_ascii=False),
			encoding="utf-8",
		)
		input_recipe = {"id": "client-supplied", "name": "追加レシピ", "items": []}

		result = self.store.create("cooking", input_recipe)

		expected_recipe = {"id": "db-cooking-9", "name": "追加レシピ", "items": []}
		self.assertEqual(result, {"craftId": "cooking", "recipe": expected_recipe})
		self.assertEqual(self.store.load_craft("cooking")[-1], expected_recipe)
		self.assertEqual(input_recipe["id"], "client-supplied")

	def test_create_starts_craft_scoped_id_at_one(self):
		result = self.store.create("weapon-smithing", {"name": "追加レシピ", "items": []})

		self.assertEqual(result["recipe"]["id"], "db-weapon-smithing-1")

	def test_create_rejects_unknown_craft(self):
		with self.assertRaisesRegex(FileNotFoundError, "^recipe_file_not_found$"):
			self.store.create("unknown", {"name": "不正", "items": []})

	def test_delete_removes_recipe(self):
		self.assertEqual(
			self.store.delete("cooking", "cooking-001"),
			{"craftId": "cooking", "deletedId": "cooking-001"},
		)
		self.assertEqual(self.store.load_craft("cooking"), [])

	def test_rejects_path_traversal(self):
		with self.assertRaisesRegex(ValueError, "^invalid_craft_id$"):
			self.store.recipe_path("../cooking")

	def test_rejects_unknown_craft(self):
		with self.assertRaisesRegex(FileNotFoundError, "^recipe_file_not_found$"):
			self.store.load_craft("unknown")


if __name__ == "__main__":
	unittest.main()
