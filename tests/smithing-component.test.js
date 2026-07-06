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
	"app/crafts/shared/smithing-damage.js",
	"app/crafts/shared/smithing-component.js",
	"app/crafts/weapon-smithing/config.js",
	"app/crafts/armor-smithing/config.js",
	"app/crafts/tool-smithing/config.js",
].forEach((file) => {
	vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});

[
	["weapon-smithing", "武器鍛冶", "武器メモ"],
	["armor-smithing", "防具鍛冶", "防具メモ"],
	["tool-smithing", "道具鍛冶", "道具メモ"],
].forEach(([craftId, label, defaultRecipeName]) => {
	const config = context.DQ10CraftConfigs[craftId];
	assert.equal(config.label, label);
	assert.equal(config.defaultRecipeName, defaultRecipeName);
	assert.equal(config.targetMode, "random-in-range");
	assert.equal(config.layout.label, "鍛冶配置");
	assert.equal(config.heatStates, context.DQ10SmithingDamage.heatStates);
	assert.ok(context.DQ10CraftComponents[craftId], `${craftId} のコンポーネントを登録してください`);
	assert.equal(
		context.DQ10CraftComponents[craftId].isBoardCellEditable?.({}),
		true,
		`${craftId} はBOARDセル右クリック編集を有効にしてください`,
	);

	const lightHammer = config.focus.tools.find((tool) => tool.id === "light-smithing-hammer");
	assert.equal(lightHammer?.label, "光の鍛冶ハンマー");
	[0, 1, 2, 3].forEach((star) => {
		assert.equal(lightHammer?.focusBonusByStars[star], 45);
	});

	const miracleHammer = config.focus.tools.find((tool) => tool.id === "miracle-smithing-hammer");
	assert.equal(miracleHammer?.label, "奇跡の鍛冶ハンマー");
	[0, 1, 2, 3].forEach((star) => {
		assert.equal(miracleHammer?.focusBonusByStars[star], 50);
	});

	const focusByLevel = Object.fromEntries(config.focus.levels.map((entry) => [entry.level, entry.focus]));
	assert.equal(focusByLevel[76], 199);
	assert.equal(focusByLevel[77], 201);
	assert.equal(focusByLevel[78], 203);
	assert.equal(focusByLevel[79], 205);
	assert.equal(focusByLevel[80], 208);
});

assert.equal(context.DQ10CraftConfigs["weapon-smithing"].techniques[0].name, "たたく");
assert.equal(context.DQ10CraftConfigs["armor-smithing"].techniques[1].name, "上下打ち");
assert.equal(context.DQ10CraftConfigs["tool-smithing"].techniques[2].name, "火力上げ");
assert.deepEqual(
	JSON.parse(JSON.stringify(context.DQ10CraftConfigs["weapon-smithing"].traits.map((trait) => [trait.id, trait.label]))),
	[
		["none", "なし"],
		["light", "光地金"],
		["double-half", "倍半"],
		["return", "戻り"],
		["focus-change", "集中変化"],
	],
);

assert.deepEqual(
	Array.from(context.DQ10CraftConfigs["tool-smithing"].recipeCategoryOptions, (category) => category.label),
	["ツボ", "ハンマー", "フライパン", "ランプ", "ルアー", "木工刀", "素材", "針"],
);
assert.equal(context.DQ10CraftConfigs["tool-smithing"].recipeCategoryLabel, "大項目");
assert.equal(context.DQ10CraftConfigs["tool-smithing"].recipeSubcategoryLabel, "道具名");

{
	const categories = Object.fromEntries(
		context.DQ10CraftConfigs["tool-smithing"].recipeCategoryOptions.map((category) => [category.id, category]),
	);
	assert.deepEqual(
		JSON.parse(JSON.stringify(categories["alchemy-pot"].templateItems.map((item) => item.gridCell))),
		[
			{ row: 1, column: 1 },
			{ row: 1, column: 2 },
			{ row: 2, column: 1 },
			{ row: 2, column: 2 },
			{ row: 3, column: 1 },
			{ row: 3, column: 2 },
		],
		"ツボは参照画像に合わせて縦3×横2の6マスにしてください",
	);
	assert.deepEqual(
		JSON.parse(JSON.stringify(categories["smithing-hammer"].templateItems.map((item) => item.gridCell))),
		[
			{ row: 1, column: 1 },
			{ row: 2, column: 1 },
			{ row: 3, column: 1 },
			{ row: 1, column: 2 },
			{ row: 2, column: 2 },
		],
		"ハンマーは左縦3マス、右縦2マスの5マスにしてください",
	);
	assert.equal(categories["frying-pan"].templateItems.length, 8);
	assert.deepEqual(
		JSON.parse(JSON.stringify(categories["lure"].templateItems.map((item) => item.gridCell))),
		[
			{ row: 1, column: 1 },
			{ row: 2, column: 1 },
			{ row: 1, column: 2 },
		],
		"ルアーは左縦2マス、右上1マスの3マスにしてください",
	);
	assert.deepEqual(
		JSON.parse(JSON.stringify(categories["material"].templateItems.map((item) => item.gridCell))),
		[
			{ row: 1, column: 1 },
			{ row: 1, column: 2 },
			{ row: 2, column: 1 },
			{ row: 2, column: 2 },
			{ row: 3, column: 1 },
			{ row: 3, column: 2 },
		],
		"素材は左縦3マス、右縦3マスの6マスにしてください",
	);
	assert.equal(categories["woodworking-knife"].templateItems.length, 3);
	assert.equal(categories["sewing-needle"].templateItems.length, 2);
}
