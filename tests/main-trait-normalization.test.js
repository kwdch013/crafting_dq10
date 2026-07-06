const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const mainJs = fs.readFileSync("app/main.js", "utf8");

const getTraitsStart = mainJs.indexOf("function getTraits");
const normalizeStart = mainJs.indexOf("function normalizeTraitId");
const normalizeEnd = mainJs.indexOf("function getTrait", normalizeStart);
const traitFunctions = mainJs.slice(getTraitsStart, normalizeEnd);

const context = {
	getCraftComponent: (craftId) => ({
		craftFamily: craftId === "cooking" ? "cooking" : "smithing",
	}),
	result: {},
};

vm.createContext(context);
vm.runInContext(`
${traitFunctions}
const smithingConfig = {
	id: "weapon-smithing",
	defaultTraitId: "none",
	traits: [
		{ id: "none" },
		{ id: "return" },
	],
};
const cookingConfig = {
	id: "cooking",
	defaultTraitId: "light",
	traits: [
		{ id: "light" },
		{ id: "recovery" },
	],
};
result.smithingReturn = normalizeTraitId(smithingConfig, "return");
result.cookingLegacyReturn = normalizeTraitId(cookingConfig, "return");
`, context);

assert.equal(context.result.smithingReturn, "return");
assert.equal(context.result.cookingLegacyReturn, "recovery");
