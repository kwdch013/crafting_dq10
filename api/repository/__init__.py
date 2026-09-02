"""レシピの保存先を選択する。"""

import os
from pathlib import Path

from .json_store import JsonRecipeStore


def create_store(data_dir=None, store_name=None, database_url=None):
	"""RECIPE_STORE に従って保存先を選ぶ。既定は json。"""
	selected = os.environ.get("RECIPE_STORE", "json") if store_name is None else store_name
	if selected == "json":
		base_dir = data_dir or Path(__file__).resolve().parents[1] / "data"
		return JsonRecipeStore(base_dir)
	if selected == "postgres":
		url = database_url or os.environ.get("DATABASE_URL", "")
		if not url:
			raise ValueError("DATABASE_URL is required for postgres recipe store")
		# psycopg を必要とするモジュールは json 選択時に読み込まないよう遅延読み込みします。
		from .postgres_store import PostgresRecipeStore

		return PostgresRecipeStore(url)
	raise ValueError(f"unknown recipe store: {selected} (valid: json, postgres)")
