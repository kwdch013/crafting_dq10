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

// テスト用の正解(ゴールデン)はコード外の fixture に分離する。
// これにより、アプリのボード編集で本番レシピデータの並び順や件数が変わっても
// テストが壊れず、config と本番データが fixture に適合するかだけを検証できる。
const crafts = [
	{
		id: "woodworking",
		recipesFile: "api/data/crafts/woodworking/recipes.json",
		fixture: require("./fixtures/woodworking-categories.json"),
		hasGrain: true,
	},
	{
		id: "sewing",
		recipesFile: "api/data/crafts/sewing/recipes.json",
		fixture: require("./fixtures/sewing-categories.json"),
		hasGrain: false,
	},
];

crafts.forEach(({ id, recipesFile, fixture, hasGrain }) => {
	const config = context.DQ10CraftConfigs[id];

	// --- config が fixture のカテゴリ定義に一致すること ---
	assert.equal(config.recipeCategoryLabel, fixture.recipeCategoryLabel, `${id} の大項目ラベル`);
	assert.equal(config.recipeSubcategoryLabel, fixture.recipeSubcategoryLabel, `${id} の装備名ラベル`);
	if (fixture.itemOptions) {
		assert.deepEqual(
			JSON.parse(JSON.stringify(config.itemOptions)),
			fixture.itemOptions,
			`${id} の木目選択肢`,
		);
	}
	assert.deepEqual(
		// config は vm コンテキスト由来でプロトタイプ realm が異なるため JSON 経由で正規化する
		JSON.parse(JSON.stringify(config.recipeCategoryOptions.map((category) => ({ id: category.id, label: category.label })))),
		fixture.categories.map((category) => ({ id: category.id, label: category.label })),
		`${id} のカテゴリ順とラベル`,
	);

	const categories = Object.fromEntries(config.recipeCategoryOptions.map((category) => [category.id, category]));
	fixture.categories.forEach((expected) => {
		const category = categories[expected.id];
		assert.ok(category, `${id} に ${expected.id} カテゴリがありません`);
		assert.deepEqual(
			JSON.parse(JSON.stringify((category.templateItems || []).map((item) => item.gridCell))),
			expected.templateGridCells,
			`${id} ${expected.id} テンプレートのマス配置`,
		);
		if (hasGrain) {
			assert.ok(
				(category.templateItems || []).every((item) => ["horizontal", "vertical"].includes(item.optionId)),
				`${id} ${expected.id} テンプレートの木目は横または縦で設定してください`,
			);
		}
	});

	assert.equal(
		context.DQ10CraftComponents[id].isBoardCellEditable?.({}),
		true,
		`${id} はBOARDセル右クリック編集を有効にしてください`,
	);

	// --- 本番レシピデータは fixture のカテゴリに属する等の不変条件のみ検証する ---
	const validCategoryIds = fixture.categories.map((category) => category.id);
	const recipes = JSON.parse(fs.readFileSync(recipesFile, "utf8"));
	recipes.forEach((recipe) => {
		assert.ok(
			validCategoryIds.includes(recipe.categoryId),
			`${recipe.id} の大項目IDは fixture のカテゴリ(${validCategoryIds.join(", ")})から選んでください`,
		);
		if (hasGrain) {
			assert.ok(
				recipe.items.every((item) => ["horizontal", "vertical"].includes(item.optionId)),
				`${recipe.id} の木目は横または縦で設定してください`,
			);
		}
		assert.notEqual(recipe.category, "木工刀", `${recipe.id} に道具画像名を使わないでください`);
		assert.notEqual(recipe.category, "針", `${recipe.id} に道具画像名を使わないでください`);
	});
});
