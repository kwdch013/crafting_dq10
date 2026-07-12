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
	"app/crafts/woodworking/component.js",
].forEach((file) => {
	vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});

const component = context.DQ10CraftComponents.woodworking;

assert.equal(typeof component.rotateGrain, "function", "木工コンポーネントに木目回転処理を定義してください");

{
	const state = {
		ingredients: [
			{ id: "top", optionId: "horizontal", gridCell: { row: 1, column: 2 } },
			{ id: "left", optionId: "vertical", gridCell: { row: 2, column: 1 } },
			{ id: "center", optionId: "horizontal", gridCell: { row: 2, column: 2 } },
		],
	};

	// 90度回転では位置変換に加えて、全マスの木目(順目/逆目)が横↔縦で反転します。
	assert.equal(component.rotateGrain(state, "right", { rows: 3, columns: 3 }), true);
	assert.deepEqual(
		Object.fromEntries(state.ingredients.map((ingredient) => [
			ingredient.id,
			[ingredient.gridCell.row, ingredient.gridCell.column, ingredient.optionId],
		])),
		{
			top: [2, 3, "vertical"],
			left: [1, 2, "horizontal"],
			center: [2, 2, "vertical"],
		},
	);
}

{
	const state = {
		ingredients: [
			{ id: "top", optionId: "horizontal", gridCell: { row: 1, column: 2 } },
			{ id: "right", optionId: "vertical", gridCell: { row: 2, column: 3 } },
		],
	};

	assert.equal(component.rotateGrain(state, "left", { rows: 3, columns: 3 }), true);
	assert.deepEqual(
		Object.fromEntries(state.ingredients.map((ingredient) => [
			ingredient.id,
			[ingredient.gridCell.row, ingredient.gridCell.column, ingredient.optionId],
		])),
		{
			top: [2, 1, "vertical"],
			right: [1, 2, "horizontal"],
		},
	);
}

{
	const state = {
		ingredients: [
			{ id: "top", optionId: "horizontal", gridCell: { row: 1, column: 2 } },
		],
	};

	assert.equal(component.rotateGrain(state, "up", { rows: 3, columns: 3 }), false);
	assert.deepEqual(state.ingredients.map((ingredient) => ingredient.gridCell), [{ row: 1, column: 2 }]);
	assert.equal(state.ingredients[0].optionId, "horizontal", "無効な方向では木目も変更しないでください");
}

{
	// 位置が変わらない中央マスでも、木目反転が起きたら変更ありとして扱います。
	const state = {
		ingredients: [
			{ id: "center", optionId: "horizontal", gridCell: { row: 2, column: 2 } },
		],
	};

	assert.equal(component.rotateGrain(state, "right", { rows: 3, columns: 3 }), true);
	assert.equal(state.ingredients[0].optionId, "vertical");
}
