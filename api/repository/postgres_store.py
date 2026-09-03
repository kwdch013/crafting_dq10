"""PostgreSQLを保存先とするレシピストア。"""

from . import integrity, mapping
from .errors import UnknownCraftError
from .import_plan import UNCATEGORIZED_ID, build_plan
from .integrity import IntegrityError
from .validation import validate_recipe


class PostgresRecipeStore:
	"""PostgreSQLから現行JSON形式のレシピを復元する。"""

	def __init__(self, database_url: str):
		self.database_url = database_url

	def _connect(self):
		"""リクエストごとに独立したDB接続を開く。"""
		# json 保存時に psycopg がなくてもAPIを起動できるよう、DB利用時だけ読み込みます。
		import psycopg

		# ThreadingHTTPServer で接続を共有しないため、プールは段階2の対象外とします。
		return psycopg.connect(self.database_url)

	def load_all(self) -> dict[str, list[dict]]:
		"""全職人のレシピを単一のSQL実行で読み込む。"""
		from . import queries

		with self._connect() as conn:
			return queries.load_all_recipes(conn)

	def load_craft(self, craft_id) -> list[dict]:
		"""指定職人のレシピを読み込む。"""
		if craft_id not in mapping.CRAFT_CLASSES:
			raise UnknownCraftError("recipe_file_not_found")

		from . import queries

		with self._connect() as conn:
			return queries.load_recipes(conn, craft_id)

	def load_masters(self, craft_id) -> dict:
		"""指定職人の分類・特性・食材マスタを読み込みます。"""
		self._validate_craft_id(craft_id)

		from . import queries

		with self._connect() as conn:
			return queries.load_masters(conn, craft_id)

	def upsert(self, craft_id, recipe) -> dict:
		"""レシピを追加または更新し、論理削除済みなら復活させる。"""
		validate_recipe(recipe)
		self._validate_craft_id(craft_id)

		from . import queries

		with self._connect() as conn:
			try:
				plan = build_plan(craft_id, [recipe], queries.load_materials(conn))
				recipe_plan = plan.recipes[0]
				revive_master_id, revive_sort_order = self._validate_upsert_conflicts(
					conn, craft_id, recipe_plan
				)
				recipe_plan.sort_order = (
					revive_sort_order
					if revive_sort_order is not None
					else self._sort_order(conn, craft_id, recipe_plan.legacy_id)
				)
				category_ids = self._category_ids(conn, craft_id, plan.categories, recipe_plan.legacy_id)
				traits = queries.load_traits(conn, craft_id)
				if recipe_plan.trait_id is not None and recipe_plan.trait_id not in traits:
					raise IntegrityError(
						f"{craft_id}/{recipe_plan.legacy_id}: "
						f"未登録の特性 {recipe_plan.trait_id} が指定されています"
					)
				queries.upsert_recipe(
					conn,
					craft_id,
					recipe_plan,
					category_ids.get(recipe_plan.category_name, UNCATEGORIZED_ID),
					traits.get(recipe_plan.trait_id, queries.NO_TRAIT_ID)
					if recipe_plan.trait_id else queries.NO_TRAIT_ID,
					revive_master_id,
				)
				conn.commit()
			except Exception as error:
				conn.rollback()
				converted = self._unique_violation_to_integrity_error(error)
				if converted is not None:
					raise converted from error
				raise
		return {"craftId": craft_id, "recipe": recipe}

	def create(self, craft_id, recipe) -> dict:
		"""DB発番IDをlegacy_idへ割り当ててレシピを追加または復活させる。"""
		validate_recipe(recipe, require_id=False)
		self._validate_craft_id(craft_id)

		from . import queries

		# build_planはIDを参照するため、永続化前だけ衝突しない仮値を渡します。
		# 検証エラーの本文にそのまま出るため、利用者が読んでも意味の通る文言にします。
		recipe_for_plan = {**recipe, "id": "(新規レシピ)"}
		with self._connect() as conn:
			try:
				plan = build_plan(craft_id, [recipe_for_plan], queries.load_materials(conn))
				recipe_plan = plan.recipes[0]
				revive_master_id, revive_sort_order = self._validate_upsert_conflicts(
					conn, craft_id, recipe_plan
				)
				if revive_master_id is not None:
					existing_legacy_id = conn.execute(
						"SELECT legacy_id FROM craft_master WHERE id = %s", (revive_master_id,)
					).fetchone()[0]
					recipe_plan.legacy_id = (
						existing_legacy_id
						or f"{queries.SERVER_LEGACY_ID_PREFIX}{revive_master_id}"
					)
					recipe_plan.sort_order = revive_sort_order
					master_id = revive_master_id
				else:
					recipe_plan.sort_order = self._next_sort_order(conn, craft_id)
					master_id = queries.insert_recipe_header(
						conn,
						craft_id,
						recipe_plan.name,
						recipe_plan.sort_order,
						recipe_plan.archived,
					)
					recipe_plan.legacy_id = f"{queries.SERVER_LEGACY_ID_PREFIX}{master_id}"
				category_ids = self._category_ids(
					conn, craft_id, plan.categories, recipe_plan.legacy_id
				)
				traits = queries.load_traits(conn, craft_id)
				if recipe_plan.trait_id is not None and recipe_plan.trait_id not in traits:
					raise IntegrityError(
						f"{craft_id}/{recipe_plan.legacy_id}: "
						f"未登録の特性 {recipe_plan.trait_id} が指定されています"
					)
				queries.upsert_recipe(
					conn,
					craft_id,
					recipe_plan,
					category_ids.get(recipe_plan.category_name, UNCATEGORIZED_ID),
					traits.get(recipe_plan.trait_id, queries.NO_TRAIT_ID)
					if recipe_plan.trait_id else queries.NO_TRAIT_ID,
					master_id,
				)
				conn.commit()
			except Exception as error:
				conn.rollback()
				converted = self._unique_violation_to_integrity_error(error)
				if converted is not None:
					raise converted from error
				raise
		return {"craftId": craft_id, "recipe": {**recipe, "id": recipe_plan.legacy_id}}

	def delete(self, craft_id, recipe_id) -> dict:
		"""指定レシピを論理削除する。存在しないIDは成功として扱う。"""
		if not recipe_id:
			raise ValueError("invalid_recipe_id")
		self._validate_craft_id(craft_id)

		with self._connect() as conn:
			try:
				conn.execute(
					"""
					UPDATE craft_master
					SET is_active = false
					WHERE legacy_id = %s AND class = %s
					""",
					(recipe_id, mapping.CRAFT_CLASSES[craft_id]),
				)
				conn.commit()
			except Exception:
				conn.rollback()
				raise
		return {"craftId": craft_id, "deletedId": recipe_id}

	def _validate_craft_id(self, craft_id) -> None:
		"""DBアクセス前に、JSONストアと同じ未知職人エラーを返す。"""
		if craft_id not in mapping.CRAFT_CLASSES:
			raise UnknownCraftError("recipe_file_not_found")

	def _category_ids(self, conn, craft_id, categories, recipe_id) -> dict[str, int]:
		"""既存分類の盤面を保護し、新規分類だけを登録します。"""
		from . import queries

		category_ids = {}
		for category in categories:
			if craft_id == "cooking":
				category_ids[category.name] = queries.upsert_category(conn, craft_id, category)
				continue
			existing = queries.load_category_cells(conn, craft_id, category.name)
			if existing is None:
				category_ids[category.name] = queries.insert_category(conn, craft_id, category)
				continue
			category_id, cells = existing
			errors = integrity.check_category_cells(cells, category.cells, f"{craft_id}/{recipe_id}")
			if errors:
				raise IntegrityError("recipe_cells_mismatch_category")
			category_ids[category.name] = category_id
		return category_ids

	def _validate_upsert_conflicts(self, conn, craft_id, recipe_plan) -> tuple[int | None, int | None]:
		"""書込み前にID所属と同名行を検証し、復活対象があれば返します。"""
		class_id = mapping.CRAFT_CLASSES[craft_id]
		existing = conn.execute(
			"SELECT class FROM craft_master WHERE legacy_id = %s",
			(recipe_plan.legacy_id,),
		).fetchone()
		if existing is not None and existing[0] != class_id:
			raise IntegrityError("recipe_id_belongs_to_other_craft")
		duplicate_name = conn.execute(
			"""
			SELECT id, is_active, sort_order
			FROM craft_master
			WHERE class = %s AND name = %s AND legacy_id IS DISTINCT FROM %s
			""",
			(class_id, recipe_plan.name, recipe_plan.legacy_id),
		).fetchone()
		if duplicate_name is not None and duplicate_name[1]:
			raise IntegrityError("recipe_name_already_exists")
		if duplicate_name is not None:
			return duplicate_name[0], duplicate_name[2]
		return None, None

	def _unique_violation_to_integrity_error(self, error) -> IntegrityError | None:
		"""競合時はDB制約を400用の固定エラーへ変換します。"""
		from psycopg.errors import UniqueViolation

		if not isinstance(error, UniqueViolation):
			return None
		identifiers = {
			"craft_master_class_name_unique": "recipe_name_already_exists",
			"craft_master_legacy_id_key": "recipe_id_already_exists",
			"craft_master_sort_order_unique": "recipe_sort_order_conflict",
		}
		# max + 1 採番の直列化は別issueで扱い、段階2では競合を400として返します。
		identifier = identifiers.get(error.diag.constraint_name)
		return IntegrityError(identifier) if identifier else None

	def _sort_order(self, conn, craft_id, legacy_id) -> int:
		"""更新時は既存位置を保ち、新規追加時だけ職人内の末尾を採番する。"""
		existing = conn.execute(
			"SELECT sort_order FROM craft_master WHERE legacy_id = %s AND class = %s",
			(legacy_id, mapping.CRAFT_CLASSES[craft_id]),
		).fetchone()
		if existing is not None:
			return existing[0]
		return conn.execute(
			"SELECT coalesce(max(sort_order), 0) + 1 FROM craft_master WHERE class = %s",
			(mapping.CRAFT_CLASSES[craft_id],),
		).fetchone()[0]

	def _next_sort_order(self, conn, craft_id) -> int:
		"""新規追加用に職人内の末尾の並び順を採番します。"""
		return conn.execute(
			"SELECT coalesce(max(sort_order), 0) + 1 FROM craft_master WHERE class = %s",
			(mapping.CRAFT_CLASSES[craft_id],),
		).fetchone()[0]
