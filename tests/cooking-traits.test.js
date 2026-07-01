const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

let registeredConfig = null;

const context = {
  registerDQ10Craft: (config) => {
    registeredConfig = config;
  },
  createDQ10FocusConfig: (config) => config,
  getDQ10FocusLevels: () => [],
  getDQ10FocusToolTypes: () => [],
  DQ10CookingDamage: {
    positions: [],
    heatStates: [],
    actions: {
      basic: { focusCost: 0, conditionId: "normal", multiplier: 1, criticalMultiplier: 2 },
      weak: { focusCost: 0, conditionId: "weak", multiplier: 1, criticalMultiplier: 2 },
      strong: { focusCost: 0, conditionId: "strong", multiplier: 1, criticalMultiplier: 2 },
      aim: { focusCost: 0, conditionId: "aim", multiplier: 1, criticalMultiplier: 2 },
    },
  },
};

vm.createContext(context);
vm.runInContext(fs.readFileSync("app/crafts/cooking/config.js", "utf8"), context);

assert.equal(
  JSON.stringify(registeredConfig.traits.map((trait) => [trait.id, trait.label])),
  JSON.stringify([
    ["light", "光"],
    ["light-return", "光・戻り"],
    ["recovery", "回復"],
  ]),
);
assert.equal(registeredConfig.defaultTraitId, "light");
