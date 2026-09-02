import json
import re
import unittest
from pathlib import Path


APP_CRAFTS_DIR = Path("app/crafts")


# recipes.js の登録呼び出しからJSON配列だけを取り出します。
def load_recipes(craft_id):
	contents = (APP_CRAFTS_DIR / craft_id / "recipes.js").read_text(encoding="utf-8")
	match = re.fullmatch(
		rf'\s*registerDQ10CraftRecipes\(\s*"{re.escape(craft_id)}"\s*,\s*(\[.*\])\s*\);\s*',
		contents,
		re.DOTALL,
	)
	if match is None:
		raise ValueError(f"{craft_id} のフォールバックレシピ形式が不正です")
	return json.loads(match.group(1))


class SmithingRecipeDataTest(unittest.TestCase):
	def test_lion_king_shield_recipe_values(self):
		recipes = load_recipes("armor-smithing")
		recipe = next(recipe for recipe in recipes if recipe["id"] == "user-armor-smithing-1787451594752")

		self.assertEqual(recipe["name"], "獅子王の大盾")
		self.assertEqual(recipe["categoryId"], "shield")
		self.assertEqual(recipe["traitId"], "light")
		self.assertEqual(
			[
				(item["gridCell"], item["target"], item["successMin"], item["successMax"])
				for item in recipe["items"]
			],
			[
				({"row": 1, "column": 1}, 445, 440, 450),
				({"row": 1, "column": 2}, 204, 200, 208),
				({"row": 2, "column": 1}, 204, 200, 208),
				({"row": 2, "column": 2}, 445, 440, 450),
			],
		)

	def test_devil_pot_recipe_is_unique_and_last(self):
		recipes = load_recipes("tool-smithing")
		recipe_id = "user-tool-smithing-1783341110554"
		matching_recipes = [recipe for recipe in recipes if recipe["id"] == recipe_id]

		self.assertEqual(len(matching_recipes), 1)
		self.assertEqual(recipes[-1]["id"], recipe_id)
		self.assertEqual(matching_recipes[0]["name"], "あくまのツボ")
		self.assertEqual(matching_recipes[0]["traitId"], "double-half")


if __name__ == "__main__":
	unittest.main()
