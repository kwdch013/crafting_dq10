"""レシピストア共通の例外。"""

# api/main.py の Handler が既存の FileNotFoundError 分岐で404を返せるよう継承します。
class UnknownCraftError(FileNotFoundError):
	"""指定された職人IDが存在しない。"""

	pass
