"""PostgreSQLを保存先とする読み取り専用レシピストア。"""

from . import mapping
from .errors import UnknownCraftError


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
		"""レシピの追加・更新は次の段階で実装する。"""
		raise NotImplementedError

	def delete(self, craft_id, recipe_id) -> dict:
		"""レシピの削除は次の段階で実装する。"""
		raise NotImplementedError
