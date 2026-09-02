"""調理の変換

マス名が3行3列の座標順に固定対応します。基準値の幅は全マスで30のため
下限だけを持ち、上限と基準値は算出します。
食材はマスごとに持ち、2マス食材だけがグループ番号を持ちます。
"""

from __future__ import annotations

from typing import Any

from . import common

CELLS = common.GRID_CELLS

# マス値と食材の列
VALUE_TEMPLATES = ("material_{cell}", "group_{cell}", "{cell}_min")

# 基準値の幅。上限は下限 + 30、基準値は下限 + 15 です。
RANGE_WIDTH = 30
TARGET_OFFSET = 15

# 2マス食材のマス数。1マス食材は ingredientSize を持ちません。
PAIR_SIZE = 2


def option_of_coordinate(row: int, column: int) -> str:
	"""マスの種別は座標から一意に決まるため、DBには持ちません。"""
	if row == 2 and column == 2:
		return "center"
	if row in (1, 3) and column in (1, 3):
		return "corner"
	return "cross"


def to_items(columns: dict[str, Any], materials: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
	"""レシピ行から現行JSONの items 配列を組み立てます。

	materials は cooking_materials の material_id をキーとした辞書です。
	食材が未設定のマスがあるため、マスの使用判定は下限 (`*_min`) で行います。
	"""
	items: list[dict[str, Any]] = []
	# レシピ内での出現順にグループ番号を振り直すための対応表
	group_numbers: dict[tuple[int, int], int] = {}
	for cell in CELLS:
		key = cell.lower()
		minimum = columns.get(f"{key}_min")
		if minimum is None:
			continue
		coordinate = common.coordinate_of_cell(cell)
		item: dict[str, Any] = {
			"id": None,
			"name": cell,
			"optionId": option_of_coordinate(coordinate["row"], coordinate["column"]),
			"gridCell": coordinate,
			"current": 0,
			"target": minimum + TARGET_OFFSET,
			"successMin": minimum,
			"successMax": minimum + RANGE_WIDTH,
		}
		material_id = columns.get(f"material_{key}")
		if material_id is not None:
			material = materials[material_id]
			group = columns.get(f"group_{key}")
			if material.get("pair_direction") and group is not None:
				number = group_numbers.setdefault(
					(material_id, group), len(group_numbers) + 1
				)
				item["ingredientGroupId"] = f"group-{number}"
			item["ingredientGroupLabel"] = material["material_name"]
			if material.get("pair_direction"):
				item["ingredientSize"] = PAIR_SIZE
		items.append(item)
	return common.assign_item_ids(common.sort_by_grid(items))


def to_columns(items: list[dict[str, Any]], material_ids: dict[str, int]) -> dict[str, Any]:
	"""items 配列からレシピ行のマス列を作ります。

	material_ids は食材名から material_id を引く辞書です。
	同じ食材のグループが複数ある場合を区別するため、グループは出現順に採番します。
	"""
	columns = common.blank_columns(VALUE_TEMPLATES, CELLS)
	group_numbers: dict[str, int] = {}
	for item in common.sort_by_grid(items):
		key = item["name"].lower()
		columns[f"{key}_min"] = item["successMin"]
		label = item.get("ingredientGroupLabel")
		if not label:
			continue
		columns[f"material_{key}"] = material_ids[label]
		group_id = item.get("ingredientGroupId")
		if group_id is not None:
			columns[f"group_{key}"] = group_numbers.setdefault(
				group_id, len(group_numbers) + 1
			)
	return columns
