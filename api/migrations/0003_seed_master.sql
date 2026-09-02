-- 固定マスタの初期データ
-- 分類テーブルの実データと座標は、現行JSONから import_recipes.py が投入します。

-- 鍛冶3職人 (class 1-3) 共通の特性
INSERT INTO smith_character (chara_id, chara_name, chara_desc, legacy_trait_id) VALUES
	(0, 'なし', 'なし、もしくは未追加', NULL),
	(1, '光', '4ターンごとに光が発生する', 'light'),
	(2, '戻り', '4ターンごとに戻りが発生する', 'return'),
	(3, '倍・半分', '4ターンごとに倍または半分が発生する', 'double-half'),
	(4, '集中変化', '4ターンごとに集中力の消費が変化する', 'focus-change');

-- 裁縫の特性。現時点では未整理のため「なし」だけを持ちます。
INSERT INTO sewing_character (chara_id, chara_name, chara_desc) VALUES
	(0, 'なし', 'なし、もしくは未追加');

-- 木工の特性。現時点では未整理のため「なし」だけを持ちます。
INSERT INTO wood_character (chara_id, chara_name, chara_desc) VALUES
	(0, 'なし', 'なし、もしくは未追加');

-- 調理の特性
INSERT INTO cooking_character (chara_id, chara_name, chara_desc, legacy_trait_id) VALUES
	(0, 'なし', 'なし、もしくは未追加', NULL),
	(1, '光', '4ターンごとに光が発生する', 'light'),
	(2, '光・戻り', '4ターンごとに光と戻りが発生する', 'light-return'),
	(3, '回復', '4ターンごとに回復が発生する', 'recovery');

-- 調理の食材マスタ。2マス食材は並び方向を持ちます。
-- 画像パスは app/cooking-ingredients.js の定義に合わせます。
INSERT INTO cooking_materials (material_id, material_name, image_path, pair_direction) VALUES
	(1, '肉', './assets/cooking/ingredient-meat.png', 'horizontal'),
	(2, '魚', './assets/cooking/ingredient-fish.png', 'vertical'),
	(3, '野菜', './assets/cooking/ingredient-vegetable.png', NULL),
	(4, '麺', './assets/cooking/ingredient-noodle.png', NULL),
	(5, '卵', './assets/cooking/ingredient-egg.png', NULL),
	(6, '小麦', './assets/cooking/ingredient-wheat.png', NULL);

-- 各分類テーブルの未分類行。大項目を持たないレシピの参照先です。
INSERT INTO tool_category (category_id, category_name) VALUES (0, '未分類');
INSERT INTO weapon_category (category_id, category_name) VALUES (0, '未分類');
INSERT INTO armor_category (category_id, category_name) VALUES (0, '未分類');
INSERT INTO sewing_category (category_id, category_name) VALUES (0, '未分類');
INSERT INTO wood_category (category_id, category_name) VALUES (0, '未分類');
INSERT INTO cooking_category (category_id, category_name) VALUES (0, '未分類');
