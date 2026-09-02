"""レシピDBから現行JSON形式へ復元するSELECT。"""

from __future__ import annotations

from typing import Any

from psycopg import sql
from psycopg.rows import dict_row

from . import mapping
from .mapping import SMITHING_CRAFTS
from .queries_write import load_materials


def load_materials_by_id(conn) -> dict[int, dict[str, Any]]:
	"""調理の食材マスタを material_id で引ける形にします。"""
	return {value["material_id"]: value for value in load_materials(conn).values()}


def load_recipes(conn, craft_id: str) -> list[dict[str, Any]]:
	"""DBから現行JSON形式のレシピ配列を復元します。"""
	query = sql.SQL("{recipe_select} ORDER BY sort_order").format(
		recipe_select=_recipe_select(craft_id, 0),
	)
	with conn.cursor(row_factory=dict_row) as cursor:
		rows = cursor.execute(query).fetchall()
	return _build_recipes(craft_id, rows, load_materials_by_id(conn) if craft_id == "cooking" else {})


def load_all_recipes(conn) -> dict[str, list[dict[str, Any]]]:
	"""全職人のレシピを1回のSQL実行で現行JSON形式へ復元します。"""
	craft_ids = tuple(sorted(mapping.CRAFT_CLASSES))
	parts = [
		_recipe_select(
			craft_id,
			order,
			materials=sql.SQL("materials.materials") if craft_id == "cooking" else sql.SQL("NULL::jsonb"),
			materials_join=sql.SQL("CROSS JOIN cooking_material_data materials") if craft_id == "cooking" else sql.SQL(""),
		)
		for order, craft_id in enumerate(craft_ids)
	]
	query = sql.SQL("""
		WITH cooking_material_data AS (
			SELECT coalesce(
				jsonb_object_agg(
					material_id,
					jsonb_build_object(
						'material_id', material_id,
						'material_name', material_name,
						'pair_direction', pair_direction
					)
				),
				'{{}}'::jsonb
			) AS materials
			FROM cooking_materials
		)
		{parts}
		ORDER BY craft_order, sort_order
	""").format(parts=sql.SQL(" UNION ALL ").join(parts))
	with conn.cursor(row_factory=dict_row) as cursor:
		rows = cursor.execute(query).fetchall()

	loaded = {craft_id: [] for craft_id in craft_ids}
	for craft_id in craft_ids:
		craft_rows = [row for row in rows if row["craft_id"] == craft_id]
		materials = _materials_from_json(craft_rows[0]["materials"]) if craft_id == "cooking" and craft_rows else {}
		loaded[craft_id] = _build_recipes(craft_id, craft_rows, materials)
	return loaded


def _recipe_select(craft_id: str, craft_order: int, materials=sql.SQL("NULL::jsonb"), materials_join=sql.SQL("")):
	"""職人別テーブルを共通のJSONB行形式へ揃えるSELECTを作ります。"""
	return sql.SQL("""
		SELECT
			{craft_id}::text AS craft_id,
			{craft_order}::integer AS craft_order,
			m.sort_order,
			m.legacy_id, m.name, m.archived,
			ch.legacy_trait_id AS trait_id,
			cat.category_name AS category,
			cat.legacy_category_id AS category_legacy_id,
			to_jsonb(cat) AS category_row,
			to_jsonb(r) AS recipe_row,
			{materials} AS materials
		FROM craft_master m
		JOIN {recipes} r ON r.id = m.id
		JOIN {categories} cat ON cat.category_id = r.category_id
		JOIN {characters} ch ON ch.chara_id = r.chara_id
		{materials_join}
		WHERE m.class = {class_id} AND m.is_active
	""").format(
		craft_id=sql.Literal(craft_id),
		craft_order=sql.Literal(craft_order),
		recipes=sql.Identifier(mapping.recipe_table(craft_id)),
		categories=sql.Identifier(mapping.category_table(craft_id)),
		characters=sql.Identifier(mapping.character_table(craft_id)),
		materials=materials,
		materials_join=materials_join,
		class_id=sql.Literal(mapping.CRAFT_CLASSES[craft_id]),
	)


def _materials_from_json(materials: dict[str, dict[str, Any]]) -> dict[int, dict[str, Any]]:
	"""JSONBオブジェクトの文字列キーを食材IDの整数キーへ戻します。"""
	return {int(material_id): value for material_id, value in materials.items()}


def _build_recipes(craft_id: str, rows: list[dict[str, Any]], materials: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
	"""共通化したSELECTの行を、職人別の変換関数でレシピへ復元します。"""
	mapping_module = mapping.get_mapping(craft_id)
	recipes: list[dict[str, Any]] = []
	for row in rows:
		if craft_id in SMITHING_CRAFTS:
			items = mapping_module.to_items(row["recipe_row"], row["category_row"])
		elif craft_id == "cooking":
			items = mapping_module.to_items(row["recipe_row"], materials)
		else:
			items = mapping_module.to_items(row["recipe_row"])
		recipes.append(mapping.common.build_recipe(row, items))
	return recipes
