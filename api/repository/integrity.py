"""DDLで強制しない整合性の検証

制約トリガーが必要なためDDLでは強制していない項目を、投入前に検証します。
対象は docs/design/09-recipe-db-schema.md「DDLで強制しない整合性」の4項目です。

- 見出しに対応する職人別テーブルの行がちょうど1件あること
  → 投入スクリプトが常に両方を書くため、ここでは扱いません。
- 鍛冶の分類内で同じ座標を複数のマスへ割り当てないこと → check_unique_coordinates
- 分類の使用マスとレシピ側の値のNULL性が一致すること → check_category_cells
- 調理の食材グループが同一食材の隣接2マスちょうどであること → check_ingredient_groups

いずれもDB接続を必要としない純粋関数です。
"""

from __future__ import annotations

from typing import Any

from .mapping import common

# 2マス食材の並び方向と、隣接とみなす座標差の対応
PAIR_STEPS = {
	"horizontal": (0, 1),  # 同じ行で列が隣
	"vertical": (1, 0),  # 同じ列で行が隣
}

# 2マス食材のマス数
PAIR_SIZE = 2


class IntegrityError(ValueError):
	"""投入前の検証に失敗したことを表します。"""


def cells_of_items(items: list[dict[str, Any]]) -> dict[str, tuple[int, int]]:
	"""items 配列からマス名と座標の対応を取り出します。"""
	return {
		item["name"]: (item["gridCell"]["row"], item["gridCell"]["column"])
		for item in items
	}


def check_unique_coordinates(cells: dict[str, tuple[int, int]], context: str) -> list[str]:
	"""同じ座標が複数のマス名に割り当てられていないことを確かめます。"""
	owners: dict[tuple[int, int], str] = {}
	errors: list[str] = []
	for name in sorted(cells):
		coordinate = cells[name]
		if coordinate in owners:
			errors.append(
				f"{context}: 座標 {coordinate} がマス {owners[coordinate]} と {name} に重複しています"
			)
			continue
		owners[coordinate] = name
	return errors


def check_category_cells(
	category_cells: dict[str, tuple[int, int]],
	recipe_cells: dict[str, tuple[int, int]],
	context: str,
) -> list[str]:
	"""分類が定義する使用マスと、レシピが値を持つマスが一致することを確かめます。"""
	errors: list[str] = []
	missing = sorted(set(category_cells) - set(recipe_cells))
	extra = sorted(set(recipe_cells) - set(category_cells))
	if missing:
		errors.append(f"{context}: 分類にあってレシピに値が無いマス {missing}")
	if extra:
		errors.append(f"{context}: 分類に無いマスにレシピが値を持っています {extra}")
	for name in sorted(set(category_cells) & set(recipe_cells)):
		if category_cells[name] != recipe_cells[name]:
			errors.append(
				f"{context}: マス {name} の座標が分類 {category_cells[name]} と"
				f"レシピ {recipe_cells[name]} で異なります"
			)
	return errors


def check_grid_cells(items: list[dict[str, Any]], context: str) -> list[str]:
	"""裁縫・木工・調理で、マス名と3行3列の座標が対応することを確かめます。

	これらの職人は座標を列名から導出するため、対応が崩れると復元できません。
	"""
	errors: list[str] = []
	for item in items:
		name = item["name"]
		if name not in common.GRID_CELLS:
			errors.append(f"{context}: マス名 {name} は3行3列の盤面に存在しません")
			continue
		expected = common.coordinate_of_cell(name)
		if item["gridCell"] != expected:
			errors.append(
				f"{context}: マス {name} の座標が {item['gridCell']} で、"
				f"想定 {expected} と異なります"
			)
	return errors


def check_ingredient_groups(
	items: list[dict[str, Any]],
	pair_directions: dict[str, str | None],
	context: str,
) -> list[str]:
	"""調理の食材グループが、同一食材の隣接2マスちょうどであることを確かめます。"""
	groups: dict[str, list[dict[str, Any]]] = {}
	errors: list[str] = []
	for item in items:
		group_id = item.get("ingredientGroupId")
		if group_id is not None:
			groups.setdefault(group_id, []).append(item)
	for group_id in sorted(groups):
		members = groups[group_id]
		labels = {member.get("ingredientGroupLabel") for member in members}
		if len(labels) != 1:
			errors.append(f"{context}: グループ {group_id} に複数の食材 {sorted(labels)} が含まれます")
			continue
		label = labels.pop()
		direction = pair_directions.get(label)
		if direction is None:
			errors.append(f"{context}: 1マス食材 {label} にグループ {group_id} が設定されています")
			continue
		if len(members) != PAIR_SIZE:
			errors.append(f"{context}: グループ {group_id} のマス数が {len(members)} です (2マス固定)")
			continue
		first, second = (
			(member["gridCell"]["row"], member["gridCell"]["column"]) for member in members
		)
		step = PAIR_STEPS[direction]
		if (abs(first[0] - second[0]), abs(first[1] - second[1])) != step:
			errors.append(
				f"{context}: グループ {group_id} の2マス {first} {second} が"
				f"{direction} に隣接していません"
			)
	return errors


def raise_for_errors(errors: list[str]) -> None:
	"""検証エラーがあればまとめて送出します。"""
	if errors:
		raise IntegrityError("\n".join(errors))
