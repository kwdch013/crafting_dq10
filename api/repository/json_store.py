"""JSONファイルを保存先とするレシピストア。"""

import json
from pathlib import Path

from .validation import validate_recipe


def read_json(path: Path):
	"""JSONファイルを読み込む。"""
	with path.open(encoding="utf-8") as file:
		return json.load(file)


def write_json(path: Path, payload):
	"""レシピJSONを人が差分確認しやすい整形で保存する。"""
	with path.open("w", encoding="utf-8") as file:
		json.dump(payload, file, ensure_ascii=False, indent=2)
		file.write("\n")


class JsonRecipeStore:
	"""data_dir配下のrecipes.jsonを操作する。"""

	def __init__(self, data_dir: Path):
		self.data_dir = data_dir

	def load_all(self) -> dict[str, list[dict]]:
		"""職人IDをキーにして全レシピを読み込む。"""
		return {
			recipe_file.parent.name: read_json(recipe_file)
			for recipe_file in sorted((self.data_dir / "crafts").glob("*/recipes.json"))
		}

	def load_craft(self, craft_id) -> list[dict]:
		"""指定職人のレシピを読み込む。"""
		return read_json(self.recipe_path(craft_id))

	def upsert(self, craft_id, recipe) -> dict:
		"""レシピIDをキーに追加または置換する。"""
		validate_recipe(recipe)
		recipe_path = self.recipe_path(craft_id)
		recipes = read_json(recipe_path)
		recipe_id = recipe["id"]
		next_recipes = [candidate for candidate in recipes if candidate.get("id") != recipe_id]
		next_recipes.append(recipe)
		write_json(recipe_path, next_recipes)
		return {"craftId": craft_id, "recipe": recipe}

	def delete(self, craft_id, recipe_id) -> dict:
		"""指定レシピをrecipes.jsonから除外する。"""
		if not recipe_id:
			raise ValueError("invalid_recipe_id")

		recipe_path = self.recipe_path(craft_id)
		recipes = read_json(recipe_path)
		next_recipes = [recipe for recipe in recipes if recipe.get("id") != recipe_id]
		write_json(recipe_path, next_recipes)
		return {"craftId": craft_id, "deletedId": recipe_id}

	def recipe_path(self, craft_id) -> Path:
		"""職人IDから対象recipes.jsonを解決し、パストラバーサルを防ぐ。"""
		if not craft_id or "/" in craft_id or "\\" in craft_id or craft_id in {".", ".."}:
			raise ValueError("invalid_craft_id")

		for recipe_path in (self.data_dir / "crafts").glob("*/recipes.json"):
			if recipe_path.parent.name == craft_id:
				return recipe_path
		raise FileNotFoundError("recipe_file_not_found")
