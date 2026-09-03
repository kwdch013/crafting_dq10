"""保存先に依存しないレシピ入力値の検証。"""


def validate_recipe(recipe, require_id=True):
	"""APIから受け取るレシピの最低限の必須項目を検証する。"""
	if not isinstance(recipe, dict):
		raise ValueError("invalid_recipe")
	recipe_id = recipe.get("id")
	name = recipe.get("name")
	items = recipe.get("items")
	if require_id and (not isinstance(recipe_id, str) or not recipe_id.strip()):
		raise ValueError("invalid_recipe_id")
	if not isinstance(name, str) or not name.strip():
		raise ValueError("invalid_recipe_name")
	if not isinstance(items, list):
		raise ValueError("invalid_recipe_items")
