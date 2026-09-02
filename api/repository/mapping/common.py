"""職人共通の変換ユーティリティ

現行JSONの items 配列と、マスを列に展開したDB行の間で共通に使う処理を持ちます。
変換規則は docs/design/12-recipe-db-conversion.md を参照します。
"""

from __future__ import annotations

from typing import Any

# 鍛冶3職人のマス。盤面が最大4行2列のため8マスです。
SMITHING_CELLS = tuple("ABCDEFGH")

# 裁縫・木工・調理のマス。3行3列に固定対応します。
GRID_CELLS = tuple("ABCDEFGHI")

# 3行3列の盤面の列数。マス名と座標の相互変換に使います。
GRID_COLUMNS = 3


def coordinate_of_cell(name: str) -> dict[str, int]:
	"""マス名から3行3列の座標を求めます。A=(1,1) から I=(3,3) の順です。"""
	index = GRID_CELLS.index(name)
	return {"row": index // GRID_COLUMNS + 1, "column": index % GRID_COLUMNS + 1}


def cell_of_coordinate(row: int, column: int) -> str:
	"""3行3列の座標からマス名を求めます。"""
	return GRID_CELLS[(row - 1) * GRID_COLUMNS + (column - 1)]


def sort_by_grid(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
	"""マスを読み順 (行→列) に並べ替えます。"""
	return sorted(items, key=lambda item: (item["gridCell"]["row"], item["gridCell"]["column"]))


def assign_item_ids(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
	"""読み順に part-1 から採番し直します。

	現行JSONは part-N / item-N / slot-行-列 が混在するため、DBには保持せず
	エクスポート時にここで統一します。
	"""
	for index, item in enumerate(items, start=1):
		item["id"] = f"part-{index}"
	return items


def build_recipe(header: dict[str, Any], items: list[dict[str, Any]]) -> dict[str, Any]:
	"""見出しの列値とマス配列から、現行JSON形式のレシピを組み立てます。

	分類は legacy_category_id を持つものだけを出力します。鍛冶のテンプレート分類は
	座標を持たせるためだけの行で、現行JSONには対応する項目がないためです。
	"""
	recipe: dict[str, Any] = {"id": header["legacy_id"], "name": header["name"]}
	if header.get("category") and header.get("category_legacy_id"):
		recipe["category"] = header["category"]
		recipe["categoryId"] = header["category_legacy_id"]
	recipe["items"] = items
	if header.get("trait_id"):
		recipe["traitId"] = header["trait_id"]
	if header.get("archived"):
		recipe["archived"] = True
	return recipe


def blank_columns(templates: tuple[str, ...], cells: tuple[str, ...]) -> dict[str, Any]:
	"""マス列をすべてNULLで初期化します。使用しないマスはNULLのままにします。

	templates は "{cell}_min" のようにマス名の差し込み位置を持つ列名です。
	"""
	return {
		template.format(cell=cell.lower()): None
		for cell in cells
		for template in templates
	}
