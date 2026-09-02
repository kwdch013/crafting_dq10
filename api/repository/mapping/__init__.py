"""職人ごとの変換モジュールを引くためのレジストリ

職人IDから、変換モジュールと対応するテーブル名を求めます。
テーブル構成は docs/design/09-recipe-db-schema.md を参照します。
"""

from __future__ import annotations

from types import ModuleType

from . import common, cooking, sewing, smithing, wood

# 職人IDと craft_master.class の対応。どの職人で作れるかを表すため必ず値を持ちます。
CRAFT_CLASSES = {
	"tool-smithing": 1,
	"weapon-smithing": 2,
	"armor-smithing": 3,
	"sewing": 4,
	"woodworking": 5,
	"cooking": 6,
}

# 職人IDとテーブル名の接頭辞の対応
TABLE_PREFIXES = {
	"tool-smithing": "tool",
	"weapon-smithing": "weapon",
	"armor-smithing": "armor",
	"sewing": "sewing",
	"woodworking": "wood",
	"cooking": "cooking",
}

# 職人IDと変換モジュールの対応。鍛冶3職人は盤面サイズ以外が同一のため共通です。
MODULES: dict[str, ModuleType] = {
	"tool-smithing": smithing,
	"weapon-smithing": smithing,
	"armor-smithing": smithing,
	"sewing": sewing,
	"woodworking": wood,
	"cooking": cooking,
}

# 鍛冶3職人は特性を共通のテーブルで持ちます。
SMITHING_CRAFTS = ("tool-smithing", "weapon-smithing", "armor-smithing")

__all__ = [
	"CRAFT_CLASSES",
	"MODULES",
	"SMITHING_CRAFTS",
	"TABLE_PREFIXES",
	"category_table",
	"character_table",
	"common",
	"cooking",
	"get_mapping",
	"recipe_table",
	"sewing",
	"smithing",
	"wood",
]


def get_mapping(craft_id: str) -> ModuleType:
	"""職人IDから変換モジュールを返します。"""
	return MODULES[craft_id]


def recipe_table(craft_id: str) -> str:
	"""職人別レシピテーブル名を返します。"""
	return f"{TABLE_PREFIXES[craft_id]}_recipes"


def category_table(craft_id: str) -> str:
	"""職人別の大分類テーブル名を返します。"""
	return f"{TABLE_PREFIXES[craft_id]}_category"


def character_table(craft_id: str) -> str:
	"""職人別の特性テーブル名を返します。鍛冶3職人は共通です。"""
	if craft_id in SMITHING_CRAFTS:
		return "smith_character"
	return f"{TABLE_PREFIXES[craft_id]}_character"
