#!/usr/bin/env python3
"""レシピDBのマイグレーション適用スクリプト

同じディレクトリの `NNNN_*.sql` をファイル名の昇順に読み、`schema_migration`
に記録の無いものだけを1ファイル1トランザクションで適用します。
適用済みのSQLは編集せず、変更は常に新しい連番ファイルとして追加します。

設計は docs/design/08-recipe-db-migration.md「マイグレーション管理」を参照します。

使い方:
    python api/migrations/apply.py [--database-url URL] [--dry-run]
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# 既定の探索先。このファイルと同じディレクトリを見ます。
MIGRATION_DIR = Path(__file__).resolve().parent

# 適用済みバージョンの記録先。マイグレーション自身の前提となるため、
# SQLファイルではなくスクリプト側で作成します。
SCHEMA_MIGRATION_DDL = """
CREATE TABLE IF NOT EXISTS schema_migration (
	version    text PRIMARY KEY,
	applied_at timestamptz NOT NULL DEFAULT now()
)
"""


def migration_files(directory: Path | None = None) -> list[Path]:
	"""マイグレーションSQLをファイル名の昇順で返します。"""
	target = Path(directory) if directory is not None else MIGRATION_DIR
	return sorted(target.glob("*.sql"), key=lambda path: path.name)


def migration_version(path: Path) -> str:
	"""SQLファイル名から拡張子を除いたものをバージョンとして扱います。"""
	return Path(path).stem


def pending_migrations(applied: set[str], directory: Path | None = None) -> list[Path]:
	"""未適用のマイグレーションだけを昇順で返します。"""
	return [
		path for path in migration_files(directory)
		if migration_version(path) not in applied
	]


def ensure_schema_migration(conn) -> None:
	"""記録テーブルを作成します。既にあれば何もしません。"""
	conn.execute(SCHEMA_MIGRATION_DDL)
	conn.commit()


def applied_versions(conn) -> set[str]:
	"""適用済みバージョンの集合を返します。

	記録テーブルが未作成の場合は空集合を返します。--dry-run から
	書き込みなしで参照できるようにするためです。
	"""
	exists = conn.execute("SELECT to_regclass('schema_migration') IS NOT NULL").fetchone()[0]
	if not exists:
		return set()
	rows = conn.execute("SELECT version FROM schema_migration").fetchall()
	return {row[0] for row in rows}


def apply_migration(conn, path: Path) -> None:
	"""1ファイルをトランザクション内で適用し、適用済みとして記録します。

	SQL側に BEGIN / COMMIT を書かないのは、ここで包むためです。
	"""
	version = migration_version(path)
	sql = Path(path).read_text(encoding="utf-8")
	try:
		conn.execute(sql)
		conn.execute(
			"INSERT INTO schema_migration (version) VALUES (%s)", (version,)
		)
		conn.commit()
	except Exception:
		conn.rollback()
		raise


def apply_all(conn, directory: Path | None = None) -> list[str]:
	"""未適用のマイグレーションを順に適用し、適用したバージョンを返します。"""
	ensure_schema_migration(conn)
	applied: list[str] = []
	for path in pending_migrations(applied_versions(conn), directory):
		apply_migration(conn, path)
		applied.append(migration_version(path))
	return applied


def resolve_database_url(explicit: str | None = None) -> str:
	"""接続先を決めます。引数、環境変数の順に見ます。"""
	url = explicit or os.environ.get("DATABASE_URL", "")
	if not url:
		raise SystemExit("DATABASE_URL が未設定です。--database-url で指定してください。")
	return url


def main(argv: list[str] | None = None) -> int:
	parser = argparse.ArgumentParser(description="レシピDBのマイグレーションを適用します")
	parser.add_argument("--database-url", help="接続先。未指定なら環境変数 DATABASE_URL を使います")
	parser.add_argument("--dry-run", action="store_true", help="適用せず対象の一覧だけを表示します")
	args = parser.parse_args(argv)

	# psycopg は DB を使うときだけ必要なため、ここで読み込みます。
	# ファイル走査だけを使う単体テストはドライバ無しの環境でも動きます。
	import psycopg

	url = resolve_database_url(args.database_url)
	with psycopg.connect(url, autocommit=False) as conn:
		if args.dry_run:
			# 記録テーブルの作成も行わず、読み取りだけで判定します。
			for path in pending_migrations(applied_versions(conn)):
				print(f"未適用: {path.name}")
			return 0
		applied = apply_all(conn)

	if not applied:
		print("未適用のマイグレーションはありません")
	for version in applied:
		print(f"適用: {version}")
	return 0


if __name__ == "__main__":
	sys.exit(main())
