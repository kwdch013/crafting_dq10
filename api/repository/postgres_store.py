"""PostgreSQLを保存先とするレシピストア。"""

from . import mapping
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

	def upsert(self, craft_id, recipe) -> dict:
		"""レシピを追加または更新し、論理削除済みなら復活させる。"""
		validate_recipe(recipe)
		self._validate_craft_id(craft_id)

		from . import queries

		with self._connect() as conn:
			try:
				plan = build_plan(craft_id, [recipe], queries.load_materials(conn))
				recipe_plan = plan.recipes[0]
				self._validate_upsert_conflicts(conn, craft_id, recipe_plan)
				recipe_plan.sort_order = self._sort_order(conn, craft_id, recipe_plan.legacy_id)
				category_ids = {
					category.name: queries.upsert_category(conn, craft_id, category)
					for category in plan.categories
				}
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
				)
				conn.commit()
			except Exception:
				conn.rollback()
				raise
		return {"craftId": craft_id, "recipe": recipe}

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

	def _validate_upsert_conflicts(self, conn, craft_id, recipe_plan) -> None:
		"""書込み前にIDの所属と職人内で一意のレシピ名を検証する。"""
		class_id = mapping.CRAFT_CLASSES[craft_id]
		existing = conn.execute(
			"SELECT class FROM craft_master WHERE legacy_id = %s",
			(recipe_plan.legacy_id,),
		).fetchone()
		if existing is not None and existing[0] != class_id:
			raise IntegrityError("recipe_id_belongs_to_other_craft")
		duplicate_name = conn.execute(
			"""
			SELECT 1
			FROM craft_master
			WHERE class = %s AND name = %s AND legacy_id <> %s
			""",
			(class_id, recipe_plan.name, recipe_plan.legacy_id),
		).fetchone()
		if duplicate_name is not None:
			raise IntegrityError("recipe_name_already_exists")

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
