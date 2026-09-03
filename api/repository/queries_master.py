"""分類・特性・食材マスタを読み取るSELECT。"""

from __future__ import annotations

from typing import Any

from psycopg import sql
from psycopg.rows import dict_row

from . import mapping


def load_masters(conn, craft_id: str) -> dict[str, Any]:
	"""指定職人の分類・特性・食材マスタをAPI形式へ組み立てます。"""
	return {
		"craftId": craft_id,
		"categories": _load_categories(conn, craft_id),
		"traits": _load_traits(conn, craft_id),
		"materials": _load_materials(conn) if craft_id == "cooking" else [],
	}


def _load_categories(conn, craft_id: str) -> list[dict[str, Any]]:
	"""分類行と、その職人で定義される使用マスを取得します。"""
	mapping_module = mapping.get_mapping(craft_id)
	cell_columns = _category_cell_columns(craft_id, mapping_module.CELLS)
	columns = ["category_id", "legacy_category_id", "category_name", *cell_columns]
	query = sql.SQL("""
		SELECT {columns}
		FROM {table}
		WHERE is_active
		ORDER BY category_id
	""").format(
		table=sql.Identifier(mapping.category_table(craft_id)),
		columns=sql.SQL(", ").join(sql.Identifier(column) for column in columns),
	)
	with conn.cursor(row_factory=dict_row) as cursor:
		rows = cursor.execute(query).fetchall()
	return [
		{
			"categoryId": row["category_id"],
			"legacyId": row["legacy_category_id"],
			"name": row["category_name"],
			"cells": _category_cells(craft_id, mapping_module.CELLS, row),
		}
		for row in rows
	]


def _category_cell_columns(craft_id: str, cells: tuple[str, ...]) -> list[str]:
	"""職人別分類テーブルから取得する使用マス列を返します。"""
	if craft_id in mapping.SMITHING_CRAFTS:
		return [
			column
			for cell in cells
			for column in (f"row_{cell.lower()}", f"col_{cell.lower()}")
		]
	if craft_id in ("sewing", "woodworking"):
		return [f"exist_{cell.lower()}" for cell in cells]
	return []


def _category_cells(craft_id: str, cells: tuple[str, ...], row: dict[str, Any]) -> list[dict[str, int | str]]:
	"""分類テーブルの職人別表現を、API共通の座標配列へ変換します。"""
	if craft_id in mapping.SMITHING_CRAFTS:
		return [
			{
				"name": cell,
				"row": row[f"row_{cell.lower()}"],
				"column": row[f"col_{cell.lower()}"],
			}
			for cell in cells
			if row[f"row_{cell.lower()}"] is not None
		]
	if craft_id in ("sewing", "woodworking"):
		return [
			{"name": cell, **mapping.common.coordinate_of_cell(cell)}
			for cell in cells
			if row[f"exist_{cell.lower()}"]
		]
	return []


def _load_traits(conn, craft_id: str) -> list[dict[str, Any]]:
	"""職人に対応する特性マスタを取得します。"""
	query = sql.SQL("""
		SELECT chara_id, legacy_trait_id, chara_name, chara_desc
		FROM {table}
		WHERE is_active
		ORDER BY chara_id
	""").format(table=sql.Identifier(mapping.character_table(craft_id)))
	with conn.cursor(row_factory=dict_row) as cursor:
		rows = cursor.execute(query).fetchall()
	return [
		{
			"charaId": row["chara_id"],
			"legacyId": row["legacy_trait_id"],
			"name": row["chara_name"],
			"description": row["chara_desc"],
		}
		for row in rows
	]


def _load_materials(conn) -> list[dict[str, Any]]:
	"""調理専用の食材マスタを取得します。"""
	with conn.cursor(row_factory=dict_row) as cursor:
		rows = cursor.execute("""
			SELECT material_id, material_name, image_path, pair_direction
			FROM cooking_materials
			WHERE is_active
			ORDER BY material_id
		""").fetchall()
	return [
		{
			"materialId": row["material_id"],
			"name": row["material_name"],
			"imagePath": row["image_path"],
			"pairDirection": row["pair_direction"],
		}
		for row in rows
	]
