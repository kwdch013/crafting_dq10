#!/usr/bin/env python3
"""現行JSONのレシピをDBへ投入します

`api/data/crafts/<職人>/recipes.json` を配列順に読み、sort_order を採番して
分類・見出し・マス列を登録します。再実行しても重複しない冪等な処理です。

DDLで強制しない整合性は投入前に検証し、違反があれば何も書き込まずに終了します。
変換規則は docs/design/12-recipe-db-conversion.md を参照します。

使い方:
    python api/scripts/import_recipes.py [--database-url URL] [--data-dir DIR]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

# api/ をパスに追加し、repository パッケージを読み込めるようにします。
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from repository import queries  # noqa: E402
from repository.import_plan import UNCATEGORIZED_ID, build_plan  # noqa: E402
from repository.integrity import IntegrityError  # noqa: E402

# 既定のデータ配置。api/data/ を指します。
DEFAULT_DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def load_catalog(data_dir: Path) -> list[str]:
	"""catalog.json から職人IDの一覧を読みます。"""
	catalog = json.loads((data_dir / "catalog.json").read_text(encoding="utf-8"))
	return [craft["id"] for craft in catalog["crafts"]]


def load_recipes(data_dir: Path, craft_id: str) -> list[dict[str, Any]]:
	"""職人ごとのレシピ配列を読みます。"""
	path = data_dir / "crafts" / craft_id / "recipes.json"
	return json.loads(path.read_text(encoding="utf-8"))


def import_craft(conn, craft_id: str, recipes: list[dict[str, Any]], materials: dict[str, Any]) -> int:
	"""1職人分を投入し、登録したレシピ数を返します。"""
	plan = build_plan(craft_id, recipes, materials)
	category_ids = {
		category.name: queries.upsert_category(conn, craft_id, category)
		for category in plan.categories
	}
	traits = queries.load_traits(conn, craft_id)
	for recipe in plan.recipes:
		if recipe.trait_id is not None and recipe.trait_id not in traits:
			raise IntegrityError(
				f"{craft_id}/{recipe.legacy_id}: 未登録の特性 {recipe.trait_id} が指定されています"
			)
		queries.upsert_recipe(
			conn,
			craft_id,
			recipe,
			category_ids.get(recipe.category_name, UNCATEGORIZED_ID),
			traits.get(recipe.trait_id, queries.NO_TRAIT_ID) if recipe.trait_id else queries.NO_TRAIT_ID,
		)
	return len(plan.recipes)


def import_all(conn, data_dir: Path) -> dict[str, int]:
	"""全職人を1トランザクションで投入し、職人ごとの件数を返します。"""
	materials = queries.load_materials(conn)
	counts: dict[str, int] = {}
	try:
		for craft_id in load_catalog(data_dir):
			counts[craft_id] = import_craft(conn, craft_id, load_recipes(data_dir, craft_id), materials)
		conn.commit()
	except Exception:
		conn.rollback()
		raise
	return counts


def main(argv: list[str] | None = None) -> int:
	parser = argparse.ArgumentParser(description="現行JSONのレシピをDBへ投入します")
	parser.add_argument("--database-url", help="接続先。未指定なら環境変数 DATABASE_URL を使います")
	parser.add_argument("--data-dir", default=str(DEFAULT_DATA_DIR), help="レシピJSONの配置先")
	args = parser.parse_args(argv)

	# psycopg はDBを使うときだけ必要なため、ここで読み込みます。
	import psycopg

	url = args.database_url or os.environ.get("DATABASE_URL", "")
	if not url:
		raise SystemExit("DATABASE_URL が未設定です。--database-url で指定してください。")

	with psycopg.connect(url, autocommit=False) as conn:
		try:
			counts = import_all(conn, Path(args.data_dir))
		except IntegrityError as error:
			print("整合性の検証に失敗しました。投入を中止します。", file=sys.stderr)
			print(error, file=sys.stderr)
			return 1

	for craft_id, count in counts.items():
		print(f"投入: {craft_id} {count}件")
	print(f"合計 {sum(counts.values())}件")
	return 0


if __name__ == "__main__":
	sys.exit(main())
