"""鍛冶3職人 (道具・武器・防具) の変換

マス名から座標を復元できないため、座標は分類テーブル (`*_category`) の
`row_*` / `col_*` から受け取ります。盤面は最大4行2列でマスは8つです。
"""

from __future__ import annotations

from typing import Any

from . import common

CELLS = common.SMITHING_CELLS

# マス値の列。基準値が範囲で決まるため下限と上限を持ちます。
VALUE_TEMPLATES = ("{cell}_min", "{cell}_max")

# 分類テーブルが持つ座標の列
COORDINATE_TEMPLATES = ("row_{cell}", "col_{cell}")


def target_of(minimum: int, maximum: int) -> int:
	"""基準値は下限と上限の中央 (切り上げ) です。DBには持たせず都度算出します。"""
	return -((-(minimum + maximum)) // 2)


def to_items(columns: dict[str, Any], coordinates: dict[str, Any]) -> list[dict[str, Any]]:
	"""レシピ行と分類の座標から、現行JSONの items 配列を組み立てます。"""
	items: list[dict[str, Any]] = []
	for cell in CELLS:
		key = cell.lower()
		minimum = columns.get(f"{key}_min")
		maximum = columns.get(f"{key}_max")
		row = coordinates.get(f"row_{key}")
		column = coordinates.get(f"col_{key}")
		if minimum is None or maximum is None or row is None or column is None:
			continue
		items.append({
			"id": None,
			"name": cell,
			"gridCell": {"row": row, "column": column},
			"current": 0,
			"target": target_of(minimum, maximum),
			"successMin": minimum,
			"successMax": maximum,
		})
	return common.assign_item_ids(common.sort_by_grid(items))


def to_columns(items: list[dict[str, Any]]) -> dict[str, Any]:
	"""items 配列からレシピ行のマス列を作ります。使用しないマスはNULLです。"""
	columns = common.blank_columns(VALUE_TEMPLATES, CELLS)
	for item in items:
		key = item["name"].lower()
		columns[f"{key}_min"] = item["successMin"]
		columns[f"{key}_max"] = item["successMax"]
	return columns


def to_coordinates(items: list[dict[str, Any]]) -> dict[str, Any]:
	"""items 配列から分類テーブルの座標列を作ります。"""
	coordinates = common.blank_columns(COORDINATE_TEMPLATES, CELLS)
	for item in items:
		key = item["name"].lower()
		coordinates[f"row_{key}"] = item["gridCell"]["row"]
		coordinates[f"col_{key}"] = item["gridCell"]["column"]
	return coordinates
