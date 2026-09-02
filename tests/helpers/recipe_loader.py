"""コミット対象のフォールバックレシピを読み込みます。"""

import json
import re
from pathlib import Path


APP_CRAFTS_DIR = Path(__file__).resolve().parents[2] / "app" / "crafts"


def load_fallback_recipes(craft_id: str) -> list[dict]:
	"""recipes.js の登録呼び出しから職人別のレシピ配列を取り出します。"""
	contents = (APP_CRAFTS_DIR / craft_id / "recipes.js").read_text(encoding="utf-8")
	match = re.fullmatch(
		rf'\s*registerDQ10CraftRecipes\(\s*"{re.escape(craft_id)}"\s*,\s*(\[.*\])\s*\);\s*',
		contents,
		re.DOTALL,
	)
	if match is None:
		raise ValueError(f"{craft_id} のフォールバックレシピ形式が不正です")
	return json.loads(match.group(1))
