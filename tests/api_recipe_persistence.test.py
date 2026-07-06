import importlib.util
import tempfile
import unittest
from pathlib import Path


def load_api_module():
	spec = importlib.util.spec_from_file_location("dq10_api_main", "api/main.py")
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


class RecipePersistenceTest(unittest.TestCase):
	def setUp(self):
		self.api = load_api_module()
		self.temp_dir = tempfile.TemporaryDirectory()
		self.data_dir = Path(self.temp_dir.name)
		self.original_data_dir = self.api.DATA_DIR
		self.api.DATA_DIR = self.data_dir
		(self.data_dir / "crafts" / "cooking").mkdir(parents=True)
		self.recipe_path = self.data_dir / "crafts" / "cooking" / "recipes.json"
		self.recipe_path.write_text(
			"""[
  {
    "id": "cooking-001",
    "name": "既存レシピ",
    "items": []
  }
]""",
			encoding="utf-8",
		)

	def tearDown(self):
		self.api.DATA_DIR = self.original_data_dir
		self.temp_dir.cleanup()

	def test_upsert_recipe_appends_user_recipe(self):
		recipe = {"id": "user-cooking-1", "name": "追加レシピ", "items": []}

		result = self.api.upsert_recipe("cooking", recipe)

		self.assertEqual(result["recipe"]["name"], "追加レシピ")
		recipes = self.api.read_json(self.recipe_path)
		self.assertEqual([recipe["id"] for recipe in recipes], ["cooking-001", "user-cooking-1"])

	def test_upsert_recipe_replaces_existing_recipe(self):
		recipe = {"id": "cooking-001", "name": "編集後レシピ", "items": []}

		self.api.upsert_recipe("cooking", recipe)

		recipes = self.api.read_json(self.recipe_path)
		self.assertEqual(len(recipes), 1)
		self.assertEqual(recipes[0]["name"], "編集後レシピ")

	def test_delete_recipe_removes_recipe_id(self):
		self.api.upsert_recipe("cooking", {"id": "user-cooking-1", "name": "追加レシピ", "items": []})

		result = self.api.delete_recipe("cooking", "user-cooking-1")

		self.assertEqual(result["deletedId"], "user-cooking-1")
		recipes = self.api.read_json(self.recipe_path)
		self.assertEqual([recipe["id"] for recipe in recipes], ["cooking-001"])

	def test_rejects_unknown_craft(self):
		with self.assertRaises(FileNotFoundError):
			self.api.upsert_recipe("unknown", {"id": "recipe-1", "name": "不正", "items": []})

	def test_rejects_path_traversal_craft_id(self):
		with self.assertRaises(ValueError):
			self.api.upsert_recipe("../cooking", {"id": "recipe-1", "name": "不正", "items": []})


if __name__ == "__main__":
	unittest.main()
