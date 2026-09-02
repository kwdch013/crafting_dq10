#!/usr/bin/env python3
"""DBのレシピスナップショットを0004_seed_recipes.sql形式で出力します。

使い方:
    python api/scripts/export_seed.py [--database-url URL] [--output PATH] [--dry-run]
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# api/ をパスに追加し、repository パッケージを読み込めるようにします。
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from psycopg import sql  # noqa: E402
from psycopg.rows import dict_row  # noqa: E402

from repository import mapping  # noqa: E402

DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "migrations" / "0004_seed_recipes.sql"


def category_columns(craft_id: str) -> list[str]:
	"""職人別分類テーブルでシードする列を既存SQLと同じ順で返します。"""
	columns = ["category_id", "category_name", "legacy_category_id"]
	module = mapping.get_mapping(craft_id)
	if craft_id in mapping.SMITHING_CRAFTS:
		return columns + [
			column
			for cell in module.CELLS
			for column in (f"row_{cell.lower()}", f"col_{cell.lower()}")
		]
	if craft_id != "cooking":
		return columns + [f"exist_{cell.lower()}" for cell in module.CELLS]
	return columns


def recipe_columns(craft_id: str) -> list[str]:
	"""職人別レシピテーブルでシードする列を既存SQLと同じ順で返します。"""
	module = mapping.get_mapping(craft_id)
	columns = ["category_id", "chara_id"]
	if craft_id in mapping.SMITHING_CRAFTS:
		return columns + [
			column
			for cell in module.CELLS
			for column in (f"{cell.lower()}_min", f"{cell.lower()}_max")
		]
	if craft_id == "cooking":
		return columns + [
			column
			for cell in module.CELLS
			for column in (f"material_{cell.lower()}", f"group_{cell.lower()}", f"{cell.lower()}_min")
		]
	if craft_id == "woodworking":
		return columns + [
			column
			for cell in module.CELLS
			for column in (f"value_{cell.lower()}", f"grain_{cell.lower()}")
		]
	return columns + [f"value_{cell.lower()}" for cell in module.CELLS]


def select_rows(conn, query):
	"""シードに必要なDB行を列名付きで取得します。"""
	with conn.cursor(row_factory=dict_row) as cursor:
		return cursor.execute(query).fetchall()


def insert_statement(conn, table: str, columns: list[str], values: list) -> str:
	"""psycopgのLiteralで値をエスケープしてINSERT文を組み立てます。"""
	statement = sql.SQL("INSERT INTO {table} ({columns}) VALUES ({values});").format(
		table=sql.Identifier(table),
		columns=sql.SQL(", ").join(sql.Identifier(column) for column in columns),
		values=sql.SQL(", ").join(
			value if isinstance(value, sql.Composable) else sql.Literal(value)
			for value in values
		),
	)
	return statement.as_string(conn)


def category_statements(conn, craft_id: str) -> list[str]:
	"""未分類行を除く分類テーブルのINSERT文をcategory_id順に作ります。"""
	columns = category_columns(craft_id)
	query = sql.SQL("SELECT {columns} FROM {table} WHERE category_id > 0 ORDER BY category_id").format(
		columns=sql.SQL(", ").join(sql.Identifier(column) for column in columns),
		table=sql.Identifier(mapping.category_table(craft_id)),
	)
	return [
		insert_statement(conn, mapping.category_table(craft_id), columns, [row[column] for column in columns])
		for row in select_rows(conn, query)
	]


def recipe_statements(conn, craft_id: str) -> list[str]:
	"""見出し直後に職人別行を置く既存シードの順でINSERT文を作ります。"""
	columns = recipe_columns(craft_id)
	table = mapping.recipe_table(craft_id)
	query = sql.SQL("""
		SELECT m.legacy_id, m.name, m.class, m.sort_order, m.archived, {recipe_columns}
		FROM craft_master m
		JOIN {table} r ON r.id = m.id
		WHERE m.class = {class_id} AND m.is_active
		ORDER BY m.sort_order
	""").format(
		recipe_columns=sql.SQL(", ").join(sql.SQL("r.{column}").format(column=sql.Identifier(column)) for column in columns),
		table=sql.Identifier(table),
		class_id=sql.Literal(mapping.CRAFT_CLASSES[craft_id]),
	)
	statements: list[str] = []
	for row in select_rows(conn, query):
		statements.append(insert_statement(
			conn,
			"craft_master",
			["legacy_id", "name", "class", "sort_order", "archived"],
			[row[column] for column in ("legacy_id", "name", "class", "sort_order", "archived")],
		))
		master_id = sql.SQL("(SELECT id FROM craft_master WHERE legacy_id = {legacy_id})").format(
			legacy_id=sql.Literal(row["legacy_id"]),
		)
		statements.append(insert_statement(
			conn, table, ["id", *columns], [master_id, *[row[column] for column in columns]]
		))
	return statements


def seed_header(output: Path) -> str:
	"""既存出力の先頭5行を維持し、別パスでは標準シードの説明を使います。"""
	source = output if output.exists() else DEFAULT_OUTPUT
	return "\n".join(source.read_text(encoding="utf-8").splitlines()[:5]) + "\n\n"


def export_seed(conn, output: Path, dry_run: bool) -> dict[str, int]:
	"""DBの全職人をシードSQLへ直列化し、職人ごとのレシピ件数を返します。"""
	statements: list[str] = []
	counts: dict[str, int] = {}
	for craft_id in mapping.CRAFT_CLASSES:
		statements.extend(category_statements(conn, craft_id))
		recipes = recipe_statements(conn, craft_id)
		statements.extend(recipes)
		counts[craft_id] = len(recipes) // 2
	content = seed_header(output) + "\n".join(statements) + "\n"
	changed = not output.exists() or output.read_text(encoding="utf-8") != content
	print(f"{'変更' if changed else '変更なし'}: {output}")
	if changed and not dry_run:
		output.parent.mkdir(parents=True, exist_ok=True)
		output.write_text(content, encoding="utf-8")
	return counts


def main(argv: list[str] | None = None) -> int:
	parser = argparse.ArgumentParser(description="DBの内容からレシピシードSQLを出力します")
	parser.add_argument("--database-url", help="接続先。未指定なら環境変数 DATABASE_URL を使います")
	parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="出力するシードSQLのパス")
	parser.add_argument("--dry-run", action="store_true", help="ファイルを書き込まず変更有無だけを表示します")
	args = parser.parse_args(argv)
	url = args.database_url or os.environ.get("DATABASE_URL", "")
	if not url:
		raise SystemExit("DATABASE_URL が未設定です。--database-url で指定してください。")

	import psycopg

	with psycopg.connect(url, autocommit=True) as conn:
		counts = export_seed(conn, Path(args.output), args.dry_run)
	for craft_id, count in counts.items():
		print(f"出力: {craft_id} {count}件")
	print(f"合計 {sum(counts.values())}件")
	return 0


if __name__ == "__main__":
	sys.exit(main())
