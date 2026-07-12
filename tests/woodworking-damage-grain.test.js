const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = {
	window: {},
};
context.window = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync("app/crafts/shared/woodworking-damage.js", "utf8"), context, {
	filename: "app/crafts/shared/woodworking-damage.js",
});

const damage = context.DQ10WoodworkingDamage;

assert.deepEqual(
	JSON.parse(JSON.stringify(damage.grainStates)),
	[
		{ id: "horizontal", label: "横" },
		{ id: "vertical", label: "縦" },
	],
);
assert.deepEqual(JSON.parse(JSON.stringify(damage.getRange("horizontal", "normal"))), [12, 18]);
assert.deepEqual(JSON.parse(JSON.stringify(damage.getRange("vertical", "normal"))), [6, 9]);
assert.deepEqual(
	JSON.parse(JSON.stringify(damage.getRange("parallel", "normal"))),
	[12, 18],
	"旧データの順目IDも互換解決してください",
);
assert.deepEqual(
	JSON.parse(JSON.stringify(damage.getDistribution("horizontal", "power_2_0"))),
	[
		{ value: 24, percent: 14.3 },
		{ value: 26, percent: 14.3 },
		{ value: 28, percent: 14.3 },
		{ value: 30, percent: 14.3 },
		{ value: 32, percent: 14.3 },
		{ value: 34, percent: 14.3 },
		{ value: 36, percent: 14.3 },
	],
	"2倍削りは参照表の7候補を等確率で表示してください",
);
assert.deepEqual(
	JSON.parse(JSON.stringify(damage.getDistribution("vertical", "power_3_0"))),
	[
		{ value: 18, percent: 14.3 },
		{ value: 20, percent: 14.3 },
		{ value: 21, percent: 14.3 },
		{ value: 23, percent: 14.3 },
		{ value: 24, percent: 14.3 },
		{ value: 26, percent: 14.3 },
		{ value: 27, percent: 14.3 },
	],
	"3倍削りの逆目も参照表の候補を使ってください",
);
assert.deepEqual(
	JSON.parse(JSON.stringify(damage.getDistribution("horizontal", "normal", { wedged: true }))),
	[
		{ value: 20, percent: 14.3 },
		{ value: 21, percent: 14.3 },
		{ value: 23, percent: 14.3 },
		{ value: 25, percent: 14.3 },
		{ value: 26, percent: 14.3 },
		{ value: 28, percent: 14.3 },
		{ value: 29, percent: 14.3 },
	],
	"くさび有効時は順目の専用候補を使ってください",
);
assert.deepEqual(
	JSON.parse(JSON.stringify(damage.getDistribution("vertical", "normal", { wedged: true }))),
	[
		{ value: 10, percent: 14.3 },
		{ value: 11, percent: 14.3 },
		{ value: 12, percent: 14.3 },
		{ value: 13, percent: 28.6 },
		{ value: 14, percent: 14.3 },
		{ value: 15, percent: 14.3 },
	],
	"重複するくさび候補は発生率を合算してください",
);
assert.deepEqual(
	JSON.parse(JSON.stringify(damage.getRange("horizontal", "power_1_4", { wedged: true }))),
	[28, 42],
	"くさびは特殊彫りの威力表にも反映してください",
);
