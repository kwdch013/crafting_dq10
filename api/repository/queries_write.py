"""レシピDBへの書き込みに使うSQL。"""

from __future__ import annotations

from typing import Any

from psycopg import sql

from . import mapping
from .import_plan import CategoryPlan, RecipePlan

# 特性なしを表す chara_id。0003_seed_master.sql が全職人に投入します。
NO_TRAIT_ID = 0

# craft_master.id と1対1で対応する、POST用のサーバー発番 legacy_id の接頭辞。
SERVER_LEGACY_ID_PREFIX = "db-"


def load_materials(conn) -> dict[str, dict[str, Any]]:
	"""調理の食材マスタを食材名で引ける形にします。"""
	rows = conn.execute(
		"SELECT material_id, material_name, pair_direction FROM cooking_materials"
	).fetchall()
	return {
		row[1]: {"material_id": row[0], "material_name": row[1], "pair_direction": row[2]}
		for row in rows
	}


def load_traits(conn, craft_id: str) -> dict[str, int]:
	"""現行JSONの traitId から chara_id を引ける形にします。"""
	table = sql.Identifier(mapping.character_table(craft_id))
	query = sql.SQL(
		"SELECT legacy_trait_id, chara_id FROM {table} WHERE legacy_trait_id IS NOT NULL"
	).format(table=table)
	return {row[0]: row[1] for row in conn.execute(query).fetchall()}


def insert_recipe_header(conn, craft_id: str, name: str, sort_order: int, archived: bool) -> int:
	"""legacy_id未設定の見出しを登録し、DB発番されたIDを返します。"""
	return conn.execute(
		"""
		INSERT INTO craft_master (name, class, sort_order, archived)
		VALUES (%s, %s, %s, %s)
		RETURNING id
		""",
		(name, mapping.CRAFT_CLASSES[craft_id], sort_order, archived),
	).fetchone()[0]


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


def insert_category(conn, craft_id: str, plan: CategoryPlan) -> int:
	"""新規分類を登録し、category_id を返します。"""
	table = sql.Identifier(mapping.category_table(craft_id))
	columns = ["category_name", "legacy_category_id", *plan.columns]
	values: dict[str, Any] = {"category_name": plan.name, "legacy_category_id": plan.legacy_id}
	values.update(plan.columns)
	query = sql.SQL("""
		INSERT INTO {table} (category_id, {columns})
		VALUES ((SELECT coalesce(max(category_id), 0) + 1 FROM {table}), {placeholders})
		RETURNING category_id
	""").format(
		table=table,
		columns=sql.SQL(", ").join(sql.Identifier(name) for name in columns),
		placeholders=sql.SQL(", ").join(sql.Placeholder(name) for name in columns),
	)
	return conn.execute(query, values).fetchone()[0]


def load_category_cells(conn, craft_id: str, category_name: str) -> tuple[int, dict[str, tuple[int, int]]] | None:
	"""既存分類の使用マスを、入力レシピとの照合用に復元します。"""
	mapping_module = mapping.get_mapping(craft_id)
	table = sql.Identifier(mapping.category_table(craft_id))
	if craft_id in mapping.SMITHING_CRAFTS:
		columns = [
			column
			for cell in mapping_module.CELLS
			for column in (f"row_{cell.lower()}", f"col_{cell.lower()}")
		]
	else:
		columns = [f"exist_{cell.lower()}" for cell in mapping_module.CELLS]
	query = sql.SQL("SELECT category_id, {columns} FROM {table} WHERE category_name = %s").format(
		table=table,
		columns=sql.SQL(", ").join(sql.Identifier(column) for column in columns),
	)
	row = conn.execute(query, (category_name,)).fetchone()
	if row is None:
		return None

	if craft_id in mapping.SMITHING_CRAFTS:
		cells = {
			cell: (row[index * 2 + 1], row[index * 2 + 2])
			for index, cell in enumerate(mapping_module.CELLS)
			if row[index * 2 + 1] is not None
		}
	else:
		cells = {
			cell: (
				mapping.common.coordinate_of_cell(cell)["row"],
				mapping.common.coordinate_of_cell(cell)["column"],
			)
			for index, cell in enumerate(mapping_module.CELLS)
			if row[index + 1]
		}
	return row[0], cells


def upsert_recipe(conn, craft_id: str, plan: RecipePlan, category_id: int, chara_id: int, revive_master_id: int | None = None) -> int:
	"""見出しと職人別レシピ行をセットで登録し、論理削除済みなら復活させます。"""
	values = {
		"legacy_id": plan.legacy_id,
		"name": plan.name,
		"class_id": mapping.CRAFT_CLASSES[craft_id],
		"sort_order": plan.sort_order,
		"archived": plan.archived,
	}
	if revive_master_id is None:
		recipe_id = conn.execute(
			"""
			INSERT INTO craft_master (legacy_id, name, class, sort_order, archived)
			VALUES (%(legacy_id)s, %(name)s, %(class_id)s, %(sort_order)s, %(archived)s)
			ON CONFLICT (legacy_id) DO UPDATE SET
				name = EXCLUDED.name,
				class = EXCLUDED.class,
				sort_order = EXCLUDED.sort_order,
				archived = EXCLUDED.archived,
				is_active = true
			RETURNING id
			""",
			values,
		).fetchone()[0]
	else:
		values["id"] = revive_master_id
		recipe_id = conn.execute(
			"""
			UPDATE craft_master
			SET legacy_id = %(legacy_id)s,
				name = %(name)s,
				class = %(class_id)s,
				archived = %(archived)s,
				is_active = true
			WHERE id = %(id)s
			RETURNING id
			""",
			values,
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
