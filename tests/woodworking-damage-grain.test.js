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
	JSON.parse(JSON.stringify(damage.getRepeatedDistribution("horizontal", "normal", 2))),
	[
		{ value: 24, percent: 2 },
		{ value: 25, percent: 4.1 },
		{ value: 26, percent: 6.1 },
		{ value: 27, percent: 8.2 },
		{ value: 28, percent: 10.2 },
		{ value: 29, percent: 12.2 },
		{ value: 30, percent: 14.3 },
		{ value: 31, percent: 12.2 },
		{ value: 32, percent: 10.2 },
		{ value: 33, percent: 8.2 },
		{ value: 34, percent: 6.1 },
		{ value: 35, percent: 4.1 },
		{ value: 36, percent: 2 },
	],
	"2倍削りは合算後の値ごとの確率を表示してください",
);
