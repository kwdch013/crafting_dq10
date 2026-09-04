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

-- 正しい料理区分の再分類は別issueで行うため、決定済みの未分類レシピだけを肉料理へ仮置きします。
UPDATE cooking_recipes
SET category_id = (
	SELECT category_id
	FROM cooking_category
	WHERE legacy_category_id = 'meat-dishes'
)
WHERE id IN (
	SELECT id
	FROM craft_master
	WHERE legacy_id IN (
		'cooking-001',
		'cooking-002',
		'cooking-006',
		'cooking-014',
		'cooking-019',
		'cooking-022',
		'cooking-024',
		'cooking-025',
		'cooking-026',
		'cooking-027',
		'cooking-028'
	)
);

-- category_id = 0 の未分類は登録時の既定値として残します。
UPDATE weapon_category
SET is_active = false
WHERE legacy_category_id IS NULL
	AND category_name = 'テンプレート (縦3マス)';

UPDATE armor_category
SET is_active = false
WHERE legacy_category_id IS NULL
	AND category_name = 'テンプレート (2×2)';

UPDATE tool_category
SET is_active = false
WHERE legacy_category_id IS NULL
	AND category_name IN ('テンプレート (縦3マス)', 'テンプレート (2×2)');
