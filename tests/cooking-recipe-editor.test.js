const assert = require("node:assert/strict");

const editor = require("../app/cooking-recipe-editor.js");

{
	assert.equal(editor.normalizeCookingIngredientLabel("魚の切り身"), "魚");
	assert.equal(editor.normalizeCookingIngredientLabel("小麦"), "小麦");
	assert.equal(editor.normalizeCookingIngredientLabel("不明"), "");
}

{
	assert.deepEqual(
		editor.getCookingIngredientSelectOptions().map((option) => option.label),
		["未選択", "肉", "魚", "野菜", "麺", "卵", "小麦"],
	);
}

{
	const items = editor.applyCookingIngredientGroups([
		{ name: "左", ingredientGroupLabel: "肉", gridCell: { row: 2, column: 1 } },
		{ name: "右", ingredientGroupLabel: "肉", gridCell: { row: 2, column: 2 } },
	]);

	assert.equal(items.valid, true);
	assert.equal(items.items[0].ingredientGroupId, "meat-2-1");
	assert.equal(items.items[1].ingredientGroupId, "meat-2-1");
	assert.equal(items.items[0].ingredientSize, 2);
}

{
	const items = editor.applyCookingIngredientGroups([
		{ name: "上", ingredientGroupLabel: "魚", gridCell: { row: 1, column: 2 } },
		{ name: "下", ingredientGroupLabel: "魚の切り身", gridCell: { row: 2, column: 2 } },
	]);

	assert.equal(items.valid, true);
	assert.equal(items.items[0].ingredientGroupLabel, "魚");
	assert.equal(items.items[1].ingredientGroupId, "fish-1-2");
}

{
	const items = editor.applyCookingIngredientGroups([
		{ name: "上", ingredientGroupLabel: "肉", gridCell: { row: 1, column: 2 } },
		{ name: "下", ingredientGroupLabel: "肉", gridCell: { row: 2, column: 2 } },
	]);

	assert.equal(items.valid, false);
	assert.match(items.message, /左右に隣り合う/);
}

{
	const items = editor.applyCookingIngredientGroups([
		{ name: "左", ingredientGroupLabel: "魚", gridCell: { row: 2, column: 1 } },
		{ name: "右", ingredientGroupLabel: "魚", gridCell: { row: 2, column: 2 } },
	]);

	assert.equal(items.valid, false);
	assert.match(items.message, /上下に隣り合う/);
}
