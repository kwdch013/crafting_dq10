const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const craftIds = [
	"cooking",
	"weapon-smithing",
	"armor-smithing",
	"tool-smithing",
	"sewing",
	"woodworking",
];
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.match(
	mainJs,
	/function getCoordinatePositionName\(config, row, column\)/,
	"レシピ追加・編集画面の配置セルでも座標順A/B/C...名を使ってください",
);
assert.doesNotMatch(
	mainJs,
	/`\$\{rowIndex\}行\$\{columnIndex\}列`/,
	"配置セルの凡例に行列表記を残さないでください",
);
assert.doesNotMatch(
	mainJs,
	/`\$\{row\}行\$\{column\}列`/,
	"配置セルの保存名に行列表記を残さないでください",
);

function createColumnLabel(index) {
	let remaining = index;
	let label = "";

	while (remaining > 0) {
		remaining -= 1;
		label = String.fromCharCode(65 + (remaining % 26)) + label;
		remaining = Math.floor(remaining / 26);
	}

	return label;
}

// 空白マスも含めた左上からの座標順で、A/B/C...の位置名を割り当てます。
function createExpectedPositionName(item, columns) {
	const row = Number(item.gridCell?.row);
	const column = Number(item.gridCell?.column);

	assert.ok(Number.isInteger(row) && row >= 1, `${item.id} のrowを設定してください`);
	assert.ok(Number.isInteger(column) && column >= 1, `${item.id} のcolumnを設定してください`);

	return createColumnLabel((row - 1) * columns + column);
}

function assertItemsHaveCoordinateNames(items, columns, sourceLabel) {
	assert.ok(Array.isArray(items), `${sourceLabel} のitemsを配列にしてください`);

	items.forEach((item) => {
		assert.equal(
			item.name,
			createExpectedPositionName(item, columns),
			`${sourceLabel} ${item.id} は空白マスを含めた座標順の位置名にしてください`,
		);
	});
}

function createConfigContext() {
	const context = { window: {} };
	context.window = context;
	vm.createContext(context);

	[
		"app/crafts/registry.js",
		"app/crafts/shared/cooking-damage.js",
		"app/crafts/shared/sewing-damage.js",
		"app/crafts/shared/woodworking-damage.js",
		"app/crafts/shared/smithing-damage.js",
		"app/crafts/shared/smithing-component.js",
		"app/crafts/cooking/config.js",
		"app/crafts/weapon-smithing/config.js",
		"app/crafts/armor-smithing/config.js",
		"app/crafts/tool-smithing/config.js",
		"app/crafts/sewing/config.js",
		"app/crafts/woodworking/config.js",
	].forEach((file) => {
		vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
	});

	return context;
}

const context = createConfigContext();

craftIds.forEach((craftId) => {
	const config = context.DQ10CraftConfigs[craftId];
	const columns = Number(config.layout?.columns);

	assert.ok(Number.isInteger(columns) && columns >= 1, `${craftId} のlayout.columnsを設定してください`);
	assertItemsHaveCoordinateNames(config.items, columns, `${craftId} config.items`);

	(config.recipeCategoryOptions || []).forEach((category) => {
		if (category.templateItems) {
			assertItemsHaveCoordinateNames(
				category.templateItems,
				columns,
				`${craftId} ${category.id} templateItems`,
			);
		}
	});

	const apiRecipes = JSON.parse(
		fs.readFileSync(path.join("api/data/crafts", craftId, "recipes.json"), "utf8"),
	);
	apiRecipes.forEach((recipe) => {
		assertItemsHaveCoordinateNames(recipe.items, columns, `${craftId} API ${recipe.id}`);
	});
});

craftIds.forEach((craftId) => {
	vm.runInContext(
		fs.readFileSync(path.join("app/crafts", craftId, "recipes.js"), "utf8"),
		context,
		{ filename: `app/crafts/${craftId}/recipes.js` },
	);
});

craftIds.forEach((craftId) => {
	const columns = Number(context.DQ10CraftConfigs[craftId].layout?.columns);
	context.DQ10CraftRecipes[craftId].forEach((recipe) => {
		assertItemsHaveCoordinateNames(recipe.items, columns, `${craftId} fallback ${recipe.id}`);
	});
});
