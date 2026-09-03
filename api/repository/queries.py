"""レシピDBクエリの後方互換用の公開窓口。"""

# 既存の呼び出し元を変えず、読み取りと書き込みの実装を責務ごとに分離します。
from .queries_read import load_all_recipes, load_materials_by_id, load_recipes
from .queries_master import load_masters
from .queries_write import (
	NO_TRAIT_ID,
	SERVER_LEGACY_ID_PREFIX,
	insert_category,
	insert_recipe_header,
	load_category_cells,
	load_materials,
	load_traits,
	upsert_category,
	upsert_recipe,
)

__all__ = [
	"NO_TRAIT_ID",
	"SERVER_LEGACY_ID_PREFIX",
	"insert_category",
	"insert_recipe_header",
	"load_all_recipes",
	"load_category_cells",
	"load_materials",
	"load_materials_by_id",
	"load_masters",
	"load_recipes",
	"load_traits",
	"upsert_category",
	"upsert_recipe",
]
