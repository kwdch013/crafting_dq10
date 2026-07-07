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
].forEach((file) => {
	vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});

{
	const config = context.DQ10CraftConfigs.woodworking;
	assert.equal(config.recipeCategoryLabel, "大項目");
	assert.equal(config.recipeSubcategoryLabel, "装備名");
	assert.deepEqual(
		JSON.parse(JSON.stringify(config.recipeCategoryOptions.map((category) => category.label))),
		["木工刀"],
	);
	assert.deepEqual(
		JSON.parse(JSON.stringify(config.recipeCategoryOptions[0].templateItems.map((item) => item.gridCell))),
		[
			{ row: 1, column: 2 },
			{ row: 2, column: 2 },
			{ row: 3, column: 2 },
		],
	);
}

{
	const config = context.DQ10CraftConfigs.sewing;
	assert.equal(config.recipeCategoryLabel, "大項目");
	assert.equal(config.recipeSubcategoryLabel, "装備名");
	assert.deepEqual(
		JSON.parse(JSON.stringify(config.recipeCategoryOptions.map((category) => category.label))),
		["針"],
	);
	assert.deepEqual(
		JSON.parse(JSON.stringify(config.recipeCategoryOptions[0].templateItems.map((item) => item.gridCell))),
		[
			{ row: 1, column: 2 },
			{ row: 2, column: 2 },
		],
	);
}

[
	["api/data/crafts/woodworking/recipes.json", "woodworking-knife", "木工刀"],
	["api/data/crafts/sewing/recipes.json", "sewing-needle", "針"],
].forEach(([file, categoryId, category]) => {
	JSON.parse(fs.readFileSync(file, "utf8")).forEach((recipe) => {
		assert.equal(recipe.categoryId, categoryId, `${recipe.id} の大項目IDを設定してください`);
		assert.equal(recipe.category, category, `${recipe.id} の大項目名を設定してください`);
	});
});
