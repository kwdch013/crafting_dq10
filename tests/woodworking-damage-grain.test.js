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
