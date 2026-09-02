"""裁縫の変換

マス名が3行3列の座標順に固定対応するため、座標は列名から導出します。
基準値は固定値のため、下限・上限・基準値がすべて同じ値になります。
"""

from __future__ import annotations

from typing import Any

from . import common

CELLS = common.GRID_CELLS

# マス値の列。固定基準値のためマスごとに1つです。
VALUE_TEMPLATES = ("value_{cell}",)

# 分類テーブルが持つ使用マスの列
EXIST_TEMPLATES = ("exist_{cell}",)


def to_items(columns: dict[str, Any]) -> list[dict[str, Any]]:
	"""レシピ行から現行JSONの items 配列を組み立てます。"""
	items: list[dict[str, Any]] = []
	for cell in CELLS:
		value = columns.get(f"value_{cell.lower()}")
		if value is None:
			continue
		items.append({
			"id": None,
			"name": cell,
			"gridCell": common.coordinate_of_cell(cell),
			"current": 0,
			"target": value,
			"successMin": value,
			"successMax": value,
		})
	return common.assign_item_ids(common.sort_by_grid(items))


def to_columns(items: list[dict[str, Any]]) -> dict[str, Any]:
	"""items 配列からレシピ行のマス列を作ります。"""
	columns = common.blank_columns(VALUE_TEMPLATES, CELLS)
	for item in items:
		columns[f"value_{item['name'].lower()}"] = item["target"]
	return columns


def to_cell_flags(items: list[dict[str, Any]]) -> dict[str, Any]:
	"""items 配列から分類テーブルの使用マス列を作ります。"""
	flags = {f"exist_{cell.lower()}": False for cell in CELLS}
	for item in items:
		flags[f"exist_{item['name'].lower()}"] = True
	return flags
