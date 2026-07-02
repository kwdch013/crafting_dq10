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
assert.equal(
  JSON.stringify(registeredConfig.techniques.map((technique) => [technique.id, technique.name, technique.specialAction || ""])),
  JSON.stringify([
    ["current-heat", "現在火力", ""],
    ["miracle-grill", "ミラクルグリル", "miracle-grill"],
  ]),
);
assert.equal(
  JSON.stringify(registeredConfig.techniques
    .filter((technique) => technique.showInTechniqueEditor !== false)
    .map((technique) => technique.id)),
  JSON.stringify(["miracle-grill"]),
);
assert.equal(
  JSON.stringify(registeredConfig.techniques
    .filter((technique) => technique.includeInAnalysis !== false)
    .map((technique) => technique.id)),
  JSON.stringify(["current-heat"]),
);
