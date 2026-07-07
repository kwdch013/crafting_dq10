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
		["スティック", "弓", "扇", "昆", "杖"],
	);
	const categories = Object.fromEntries(config.recipeCategoryOptions.map((category) => [category.id, category]));
	assert.equal(categories.stick.templateItems.length, 2);
	assert.equal(categories.bow.templateItems.length, 5);
	assert.equal(categories.fan.templateItems.length, 4);
	assert.equal(categories.kon.templateItems.length, 6);
	assert.deepEqual(JSON.parse(JSON.stringify(categories.staff.templateItems.map((item) => item.gridCell))), [
		{ row: 1, column: 2 },
		{ row: 2, column: 2 },
		{ row: 3, column: 2 },
	]);
}

{
	const config = context.DQ10CraftConfigs.sewing;
	assert.equal(config.recipeCategoryLabel, "大項目");
	assert.equal(config.recipeSubcategoryLabel, "装備名");
	assert.deepEqual(
		JSON.parse(JSON.stringify(config.recipeCategoryOptions.map((category) => category.label))),
		["体上", "体下", "腕", "足", "頭"],
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
}

[
	["api/data/crafts/woodworking/recipes.json", ["stick", "bow", "fan", "kon", "staff"]],
	["api/data/crafts/sewing/recipes.json", ["body-upper", "body-lower", "arm", "foot", "head"]],
].forEach(([file, categoryIds]) => {
	JSON.parse(fs.readFileSync(file, "utf8")).forEach((recipe) => {
		assert.ok(categoryIds.includes(recipe.categoryId), `${recipe.id} の大項目IDを参照画像名由来にしてください`);
		assert.notEqual(recipe.category, "木工刀", `${recipe.id} に道具画像名を使わないでください`);
		assert.notEqual(recipe.category, "針", `${recipe.id} に道具画像名を使わないでください`);
	});
});
