#!/usr/bin/env python3
"""DBのレシピをJSONとフロント用フォールバックへ出力します。

使い方:
    python api/scripts/export_recipes.py [--database-url URL] [--data-dir DIR]
        [--app-dir DIR] [--craft CRAFT_ID] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# api/ をパスに追加し、repository パッケージを読み込めるようにします。
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from repository import mapping, queries  # noqa: E402
from repository.json_store import write_json  # noqa: E402

DEFAULT_DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DEFAULT_APP_DIR = Path(__file__).resolve().parents[2] / "app"


def json_text(recipes: list[dict]) -> str:
	"""write_json と同じ比較用の文字列を作ります。"""
	return json.dumps(recipes, ensure_ascii=False, indent=2) + "\n"


def javascript_text(craft_id: str, recipes: list[dict]) -> str:
	"""フロントのレシピ登録関数を呼ぶフォールバック形式を作ります。"""
	return f'registerDQ10CraftRecipes("{craft_id}", ' + json.dumps(recipes, ensure_ascii=False, indent=2) + ");\n"


def has_change(path: Path, content: str) -> bool:
	"""未作成または内容が異なるファイルだけを変更対象として扱います。"""
	return not path.exists() or path.read_text(encoding="utf-8") != content


def export_recipes(conn, data_dir: Path, app_dir: Path, craft_ids: list[str], dry_run: bool) -> dict[str, int]:
	"""指定職人のレシピを2種類のフォールバックファイルへ出力します。"""
	all_recipes = queries.load_all_recipes(conn)
	counts: dict[str, int] = {}
	for craft_id in craft_ids:
		recipes = all_recipes[craft_id]
		counts[craft_id] = len(recipes)
		json_path = data_dir / "crafts" / craft_id / "recipes.json"
		js_path = app_dir / "crafts" / craft_id / "recipes.js"
		outputs = ((json_path, json_text(recipes)), (js_path, javascript_text(craft_id, recipes)))
		for path, content in outputs:
			if not has_change(path, content):
				print(f"変更なし: {path}")
				continue
			print(f"変更: {path}")
			if dry_run:
				continue
			path.parent.mkdir(parents=True, exist_ok=True)
			if path == json_path:
				# JSONの整形は既存ストアの出力形式と常に一致させます。
				write_json(path, recipes)
			else:
				path.write_text(content, encoding="utf-8")
	return counts


def main(argv: list[str] | None = None) -> int:
	parser = argparse.ArgumentParser(description="DBのレシピをJSONとrecipes.jsへ出力します")
	parser.add_argument("--database-url", help="接続先。未指定なら環境変数 DATABASE_URL を使います")
	parser.add_argument("--data-dir", default=str(DEFAULT_DATA_DIR), help="api/data の出力先")
	parser.add_argument("--app-dir", default=str(DEFAULT_APP_DIR), help="app の出力先")
	parser.add_argument("--craft", choices=sorted(mapping.CRAFT_CLASSES), help="出力する職人ID")
	parser.add_argument("--dry-run", action="store_true", help="ファイルを書き込まず変更対象だけを表示します")
	args = parser.parse_args(argv)
	url = args.database_url or os.environ.get("DATABASE_URL", "")
	if not url:
		raise SystemExit("DATABASE_URL が未設定です。--database-url で指定してください。")

	import psycopg

	craft_ids = [args.craft] if args.craft else list(mapping.CRAFT_CLASSES)
	with psycopg.connect(url, autocommit=True) as conn:
		counts = export_recipes(conn, Path(args.data_dir), Path(args.app_dir), craft_ids, args.dry_run)
	for craft_id, count in counts.items():
		print(f"出力: {craft_id} {count}件")
	print(f"合計 {sum(counts.values())}件")
	return 0


if __name__ == "__main__":
	sys.exit(main())
