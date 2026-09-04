-- 変換用分類の盤面形状と一致する既存分類へ、対象レシピを再割り当てします。
UPDATE weapon_recipes
SET category_id = (
	SELECT category_id
	FROM weapon_category
	WHERE legacy_category_id = 'one-handed-sword'
)
WHERE id = (
	SELECT id
	FROM craft_master
	WHERE legacy_id = 'weapon-vertical-3'
);

UPDATE armor_recipes
SET category_id = (
	SELECT category_id
	FROM armor_category
	WHERE legacy_category_id = 'shield'
)
WHERE id = (
	SELECT id
	FROM craft_master
	WHERE legacy_id = 'armor-2x2'
);

UPDATE tool_recipes
SET category_id = (
	SELECT category_id
	FROM tool_category
	WHERE legacy_category_id = 'woodworking-knife'
)
WHERE id = (
	SELECT id
	FROM craft_master
	WHERE legacy_id = 'tool-vertical-3'
);

UPDATE tool_recipes
SET category_id = (
	SELECT category_id
	FROM tool_category
	WHERE legacy_category_id = 'smithing-hammer'
)
WHERE id = (
	SELECT id
	FROM craft_master
	WHERE legacy_id = 'tool-2x2'
);

-- 正しい料理区分の再分類は別issueで行うため、未分類は一律で肉料理へ仮置きします。
UPDATE cooking_recipes
SET category_id = (
	SELECT category_id
	FROM cooking_category
	WHERE legacy_category_id = 'meat-dishes'
)
WHERE category_id = 0;

-- category_id = 0 の未分類は登録時の既定値として残します。
UPDATE weapon_category
SET is_active = false
WHERE legacy_category_id IS NULL
	AND category_id <> 0;

UPDATE armor_category
SET is_active = false
WHERE legacy_category_id IS NULL
	AND category_id <> 0;

UPDATE tool_category
SET is_active = false
WHERE legacy_category_id IS NULL
	AND category_id <> 0;
