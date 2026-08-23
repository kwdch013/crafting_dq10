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
	"app/crafts/shared/cooking-damage.js",
	"app/crafts/cooking/config.js",
].forEach((file) => {
	vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});

const cookingConfig = context.DQ10CraftConfigs.cooking;
const miraclePan = cookingConfig.focus.tools.find((tool) => tool.id === "miracle-frying-pan");

assert.equal(miraclePan?.label, "奇跡のフライパン");
[0, 1, 2, 3].forEach((star) => {
	assert.equal(miraclePan?.focusBonusByStars[star], 50);
});
