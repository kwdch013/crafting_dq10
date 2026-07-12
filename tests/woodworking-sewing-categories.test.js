const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = {
	window: {},
};
context.window = context;

vm.createContext(context);
[
	"app/crafts/registry.js",
	"app/crafts/shared/sewing-damage.js",
	"app/crafts/woodworking/config.js",
	"app/crafts/sewing/config.js",
	"app/crafts/woodworking/component.js",
	"app/crafts/sewing/component.js",
].forEach((file) => {
	vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});

{
	const config = context.DQ10CraftConfigs.woodworking;
	assert.equal(config.recipeCategoryLabel, "大項目");
	assert.equal(config.recipeSubcategoryLabel, "装備名");
	assert.deepEqual(
		JSON.parse(JSON.stringify(config.recipeCategoryOptions.map((category) => category.label))),
		["スティック", "杖", "昆", "扇", "弓"],
	);
	const categories = Object.fromEntries(config.recipeCategoryOptions.map((category) => [category.id, category]));
	assert.deepEqual(
		JSON.parse(JSON.stringify(config.itemOptions)),
		[
			{ id: "horizontal", label: "横" },
			{ id: "vertical", label: "縦" },
		],
	);
	assert.equal(categories.stick.templateItems.length, 2);
	assert.equal(categories.bow.templateItems.length, 5);
	assert.equal(categories.fan.templateItems.length, 4);
	assert.equal(categories.kon.templateItems.length, 6);
	assert.ok(
		categories.kon.templateItems.every((item) => ["horizontal", "vertical"].includes(item.optionId)),
		"木工テンプレートの木目は横または縦で設定してください",
	);
	assert.deepEqual(JSON.parse(JSON.stringify(categories.staff.templateItems.map((item) => item.gridCell))), [
		{ row: 1, column: 2 },
		{ row: 2, column: 2 },
		{ row: 3, column: 2 },
	]);
	assert.equal(
		context.DQ10CraftComponents.woodworking.isBoardCellEditable?.({}),
		true,
		"木工はBOARDセル右クリック編集を有効にしてください",
	);
}

{
	const config = context.DQ10CraftConfigs.sewing;
	assert.equal(config.recipeCategoryLabel, "大項目");
	assert.equal(config.recipeSubcategoryLabel, "装備名");
	assert.deepEqual(
		JSON.parse(JSON.stringify(config.recipeCategoryOptions.map((category) => category.label))),
		["アタマ", "からだ上", "からだ下", "ウデ", "足"],
	);
	const categories = Object.fromEntries(config.recipeCategoryOptions.map((category) => [category.id, category]));
	assert.equal(categories["body-upper"].templateItems.length, 6);
	assert.equal(categories["body-lower"].templateItems.length, 6);
	assert.equal(categories.arm.templateItems.length, 6);
	assert.equal(categories.foot.templateItems.length, 4);
	assert.deepEqual(JSON.parse(JSON.stringify(categories.head.templateItems.map((item) => item.gridCell))), [
		{ row: 1, column: 2 },
		{ row: 2, column: 1 },
		{ row: 2, column: 2 },
		{ row: 2, column: 3 },
	]);
	assert.equal(
		context.DQ10CraftComponents.sewing.isBoardCellEditable?.({}),
		true,
		"裁縫はBOARDセル右クリック編集を有効にしてください",
	);
}

// カテゴリ順・テンプレート構造の固定検証は config(編集されない真実源)側へ集約する。
// 本番レシピデータはアプリのボード編集で並び順や件数が変わり得るため、
// ここでは「順序スナップショット」ではなく config 由来の不変条件のみを検証する。
[
	["woodworking", "api/data/crafts/woodworking/recipes.json"],
	["sewing", "api/data/crafts/sewing/recipes.json"],
].forEach(([craftId, file]) => {
	const validCategoryIds = context.DQ10CraftConfigs[craftId].recipeCategoryOptions.map(
		(category) => category.id,
	);
	const recipes = JSON.parse(fs.readFileSync(file, "utf8"));
	recipes.forEach((recipe) => {
		assert.ok(
			validCategoryIds.includes(recipe.categoryId),
			`${recipe.id} の大項目IDは config のカテゴリ(${validCategoryIds.join(", ")})から選んでください`,
		);
		if (craftId === "woodworking") {
			assert.ok(
				recipe.items.every((item) => ["horizontal", "vertical"].includes(item.optionId)),
				`${recipe.id} の木目は横または縦で設定してください`,
			);
		}
		assert.notEqual(recipe.category, "木工刀", `${recipe.id} に道具画像名を使わないでください`);
		assert.notEqual(recipe.category, "針", `${recipe.id} に道具画像名を使わないでください`);
	});
});
