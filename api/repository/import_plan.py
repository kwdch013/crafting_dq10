"""現行JSONから投入計画を組み立てます (DB不要)

`api/data/crafts/<職人>/recipes.json` を読み、分類・レシピ見出し・マス列を
DBの列構成へ変換します。DDLで強制しない整合性はここで検証します。

DBへの書き込みは api/scripts/import_recipes.py が行います。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from . import integrity
from .mapping import CRAFT_CLASSES, SMITHING_CRAFTS, get_mapping

# 特性なしを表す現行JSONの値。DBでは chara_id = 0 に対応します。
NO_TRAIT_VALUES = ("", "none", None)

# 大分類を持たないレシピが参照する分類。0003_seed_master.sql が投入します。
UNCATEGORIZED_ID = 0


@dataclass
class CategoryPlan:
	"""分類テーブルへ投入する1行"""

	name: str
	legacy_id: str | None
	# 鍛冶は row_*/col_*、裁縫・木工は exist_*、調理は空です。
	columns: dict[str, Any] = field(default_factory=dict)
	# 検証用に保持するマス名と座標の対応
	cells: dict[str, tuple[int, int]] = field(default_factory=dict)


@dataclass
class RecipePlan:
	"""craft_master と職人別レシピテーブルへ投入する1組"""

	legacy_id: str
	name: str
	sort_order: int
	archived: bool
	category_name: str | None
	trait_id: str | None
	columns: dict[str, Any]


@dataclass
class CraftPlan:
	"""1職人分の投入計画"""

	craft_id: str
	class_id: int
	categories: list[CategoryPlan]
	recipes: list[RecipePlan]


def template_category_name(cells: dict[str, tuple[int, int]]) -> str:
	"""大分類を持たない鍛冶レシピのために、盤面の形からテンプレート分類名を作ります。

	鍛冶は座標を分類テーブルが持つため、分類が無いと盤面を復元できません。
	"""
	rows = sorted({row for row, _ in cells.values()})
	columns = sorted({column for _, column in cells.values()})
	if len(cells) == len(rows) * len(columns):
		if len(columns) == 1:
			return f"テンプレート (縦{len(rows)}マス)"
		if len(rows) == 1:
			return f"テンプレート (横{len(columns)}マス)"
		return f"テンプレート ({len(rows)}×{len(columns)})"
	# 長方形に収まらない形は座標をそのまま名前にします。
	shape = ",".join(f"{row}-{column}" for row, column in sorted(cells.values()))
	return f"テンプレート ({shape})"


def trait_of(recipe: dict[str, Any]) -> str | None:
	"""現行JSONの traitId を返します。特性なしは None です。"""
	trait_id = recipe.get("traitId")
	return None if trait_id in NO_TRAIT_VALUES else trait_id


def build_plan(
	craft_id: str,
	recipes: list[dict[str, Any]],
	materials: dict[str, dict[str, Any]],
) -> CraftPlan:
	"""1職人分のレシピ配列から投入計画を組み立てます。

	materials は食材名をキーに material_id と pair_direction を持つ辞書です
	(調理以外では使いません)。整合性に反する場合は IntegrityError を送出します。
	"""
	mapping_module = get_mapping(craft_id)
	is_smithing = craft_id in SMITHING_CRAFTS
	is_cooking = craft_id == "cooking"
	pair_directions = {name: value["pair_direction"] for name, value in materials.items()}
	material_ids = {name: value["material_id"] for name, value in materials.items()}

	categories: dict[str, CategoryPlan] = {}
	plans: list[RecipePlan] = []
	errors: list[str] = []

	for sort_order, recipe in enumerate(recipes, start=1):
		items = recipe.get("items", [])
		context = f"{craft_id}/{recipe['id']}"
		cells = integrity.cells_of_items(items)

		if is_smithing:
			errors += integrity.check_unique_coordinates(cells, context)
		else:
			errors += integrity.check_grid_cells(items, context)
		if is_cooking:
			errors += integrity.check_ingredient_groups(items, pair_directions, context)

		category = _resolve_category(recipe, cells, is_smithing)
		if category is not None:
			registered = categories.setdefault(category.name, category)
			errors += _merge_category(registered, category, mapping_module, items, context, is_cooking)

		columns = (
			mapping_module.to_columns(items, material_ids)
			if is_cooking
			else mapping_module.to_columns(items)
		)
		plans.append(RecipePlan(
			legacy_id=recipe["id"],
			name=recipe["name"],
			sort_order=sort_order,
			archived=bool(recipe.get("archived")),
			category_name=category.name if category is not None else None,
			trait_id=trait_of(recipe),
			columns=columns,
		))

	integrity.raise_for_errors(errors)
	return CraftPlan(
		craft_id=craft_id,
		class_id=CRAFT_CLASSES[craft_id],
		categories=list(categories.values()),
		recipes=plans,
	)


def _resolve_category(
	recipe: dict[str, Any],
	cells: dict[str, tuple[int, int]],
	is_smithing: bool,
) -> CategoryPlan | None:
	"""レシピが属する分類を決めます。分類を持たない場合は None (未分類) です。"""
	name = recipe.get("category") or None
	legacy_id = recipe.get("categoryId") or None
	if name is None:
		if not is_smithing or not cells:
			return None
		# 鍛冶は分類が座標を持つため、分類が無いレシピにはテンプレート分類を作ります。
		return CategoryPlan(name=template_category_name(cells), legacy_id=None, cells=dict(cells))
	return CategoryPlan(name=name, legacy_id=legacy_id, cells=dict(cells))


def _merge_category(
	registered: CategoryPlan,
	incoming: CategoryPlan,
	mapping_module: Any,
	items: list[dict[str, Any]],
	context: str,
	is_cooking: bool,
) -> list[str]:
	"""同じ分類に属するレシピの使用マスが一致することを確かめ、列値を確定します。

	調理は同一分類でも使用マスが揃わないため、分類はマスを持ちません。
	"""
	if is_cooking:
		return []
	errors = integrity.check_category_cells(registered.cells, incoming.cells, context)
	if registered.legacy_id is None:
		registered.legacy_id = incoming.legacy_id
	if not registered.columns:
		registered.columns = (
			mapping_module.to_coordinates(items)
			if hasattr(mapping_module, "to_coordinates")
			else mapping_module.to_cell_flags(items)
		)
	return errors
