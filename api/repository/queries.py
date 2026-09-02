"""レシピDBへの読み書きに使うSQL

投入スクリプトとラウンドトリップテストが共有します。
段階2のリポジトリ層 (postgres_store) もここを利用します。
"""

from __future__ import annotations

from typing import Any

from psycopg import sql
from psycopg.rows import dict_row

from . import mapping
from .import_plan import CategoryPlan, RecipePlan
from .mapping import SMITHING_CRAFTS

# 特性なしを表す chara_id。0003_seed_master.sql が全職人に投入します。
NO_TRAIT_ID = 0


def load_materials(conn) -> dict[str, dict[str, Any]]:
	"""調理の食材マスタを食材名で引ける形にします。"""
	rows = conn.execute(
		"SELECT material_id, material_name, pair_direction FROM cooking_materials"
	).fetchall()
	return {
		row[1]: {"material_id": row[0], "material_name": row[1], "pair_direction": row[2]}
		for row in rows
	}


def load_materials_by_id(conn) -> dict[int, dict[str, Any]]:
	"""調理の食材マスタを material_id で引ける形にします。"""
	return {value["material_id"]: value for value in load_materials(conn).values()}


def load_traits(conn, craft_id: str) -> dict[str, int]:
	"""現行JSONの traitId から chara_id を引ける形にします。"""
	table = sql.Identifier(mapping.character_table(craft_id))
	query = sql.SQL(
		"SELECT legacy_trait_id, chara_id FROM {table} WHERE legacy_trait_id IS NOT NULL"
	).format(table=table)
	return {row[0]: row[1] for row in conn.execute(query).fetchall()}


def upsert_category(conn, craft_id: str, plan: CategoryPlan) -> int:
	"""分類を登録し、category_id を返します。分類名で冪等に上書きします。

	category_id は識別子列ではないため、既存の最大値 + 1 を採番します。
	"""
	table = sql.Identifier(mapping.category_table(craft_id))
	columns = ["category_name", "legacy_category_id", *plan.columns]
	values: dict[str, Any] = {"category_name": plan.name, "legacy_category_id": plan.legacy_id}
	values.update(plan.columns)
	query = sql.SQL("""
		INSERT INTO {table} (category_id, {columns})
		VALUES ((SELECT coalesce(max(category_id), 0) + 1 FROM {table}), {placeholders})
		ON CONFLICT (category_name) DO UPDATE SET {updates}
		RETURNING category_id
	""").format(
		table=table,
		columns=sql.SQL(", ").join(sql.Identifier(name) for name in columns),
		placeholders=sql.SQL(", ").join(sql.Placeholder(name) for name in columns),
		updates=sql.SQL(", ").join(
			sql.SQL("{name} = EXCLUDED.{name}").format(name=sql.Identifier(name))
			for name in columns
			if name != "category_name"
		),
	)
	return conn.execute(query, values).fetchone()[0]


def upsert_recipe(conn, craft_id: str, plan: RecipePlan, category_id: int, chara_id: int) -> int:
	"""見出しと職人別レシピ行を必ずセットで登録し、craft_master.id を返します。"""
	recipe_id = conn.execute(
		"""
		INSERT INTO craft_master (legacy_id, name, class, sort_order, archived)
		VALUES (%(legacy_id)s, %(name)s, %(class_id)s, %(sort_order)s, %(archived)s)
		ON CONFLICT (legacy_id) DO UPDATE SET
			name = EXCLUDED.name,
			class = EXCLUDED.class,
			sort_order = EXCLUDED.sort_order,
			archived = EXCLUDED.archived
		RETURNING id
		""",
		{
			"legacy_id": plan.legacy_id,
			"name": plan.name,
			"class_id": mapping.CRAFT_CLASSES[craft_id],
			"sort_order": plan.sort_order,
			"archived": plan.archived,
		},
	).fetchone()[0]

	columns = ["category_id", "chara_id", *plan.columns]
	values: dict[str, Any] = {"id": recipe_id, "category_id": category_id, "chara_id": chara_id}
	values.update(plan.columns)
	query = sql.SQL("""
		INSERT INTO {table} (id, {columns})
		VALUES (%(id)s, {placeholders})
		ON CONFLICT (id) DO UPDATE SET {updates}
	""").format(
		table=sql.Identifier(mapping.recipe_table(craft_id)),
		columns=sql.SQL(", ").join(sql.Identifier(name) for name in columns),
		placeholders=sql.SQL(", ").join(sql.Placeholder(name) for name in columns),
		updates=sql.SQL(", ").join(
			sql.SQL("{name} = EXCLUDED.{name}").format(name=sql.Identifier(name))
			for name in columns
		),
	)
	conn.execute(query, values)
	return recipe_id


def load_recipes(conn, craft_id: str) -> list[dict[str, Any]]:
	"""DBから現行JSON形式のレシピ配列を復元します。

	鍛冶の座標は分類テーブルが持つため、分類行ごと取得して渡します。
	"""
	query = sql.SQL("""
		SELECT
			m.legacy_id, m.name, m.archived,
			ch.legacy_trait_id AS trait_id,
			cat.category_name AS category,
			cat.legacy_category_id AS category_legacy_id,
			to_jsonb(cat) AS category_row,
			to_jsonb(r) AS recipe_row
		FROM craft_master m
		JOIN {recipes} r ON r.id = m.id
		JOIN {categories} cat ON cat.category_id = r.category_id
		JOIN {characters} ch ON ch.chara_id = r.chara_id
		WHERE m.class = %(class_id)s AND m.is_active
		ORDER BY m.sort_order
	""").format(
		recipes=sql.Identifier(mapping.recipe_table(craft_id)),
		categories=sql.Identifier(mapping.category_table(craft_id)),
		characters=sql.Identifier(mapping.character_table(craft_id)),
	)
	with conn.cursor(row_factory=dict_row) as cursor:
		rows = cursor.execute(query, {"class_id": mapping.CRAFT_CLASSES[craft_id]}).fetchall()

	mapping_module = mapping.get_mapping(craft_id)
	materials = load_materials_by_id(conn) if craft_id == "cooking" else {}
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
