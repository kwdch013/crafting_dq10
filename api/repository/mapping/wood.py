"""木工の変換

マス名が3行3列の座標順に固定対応します。木目はレシピ内で混在するため
マス単位で持ち、true が縦 (逆目)、false が横です。
"""

from __future__ import annotations

from typing import Any

from . import common

CELLS = common.GRID_CELLS

# マス値と木目の列
VALUE_TEMPLATES = ("value_{cell}", "grain_{cell}")

# 分類テーブルが持つ使用マスの列
EXIST_TEMPLATES = ("exist_{cell}",)

# 木目の真偽値と現行JSONの optionId の対応
GRAIN_VERTICAL = "vertical"
GRAIN_HORIZONTAL = "horizontal"


def to_items(columns: dict[str, Any]) -> list[dict[str, Any]]:
	"""レシピ行から現行JSONの items 配列を組み立てます。"""
	items: list[dict[str, Any]] = []
	for cell in CELLS:
		key = cell.lower()
		value = columns.get(f"value_{key}")
		if value is None:
			continue
		grain = columns.get(f"grain_{key}")
		items.append({
			"id": None,
			"name": cell,
			"optionId": GRAIN_VERTICAL if grain else GRAIN_HORIZONTAL,
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
		key = item["name"].lower()
		columns[f"value_{key}"] = item["target"]
		columns[f"grain_{key}"] = item.get("optionId") == GRAIN_VERTICAL
	return columns


def to_cell_flags(items: list[dict[str, Any]]) -> dict[str, Any]:
	"""items 配列から分類テーブルの使用マス列を作ります。"""
	flags = {f"exist_{cell.lower()}": False for cell in CELLS}
	for item in items:
		flags[f"exist_{item['name'].lower()}"] = True
	return flags
