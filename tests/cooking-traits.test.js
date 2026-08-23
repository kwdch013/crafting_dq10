const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const mainJs = fs.readFileSync("app/main.js", "utf8");
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
  Array.isArray(registeredConfig.recipeCategoryOptions),
  false,
  "調理職人は基本設定の大項目を表示しないでください",
);
assert.match(
  mainJs,
  /function renderTraitInfo\(\)/,
  "調理職人の特性説明は基本設定ではなく特性情報パネルに表示してください",
);
assert.equal(
  JSON.stringify(registeredConfig.techniques.map((technique) => [
    technique.id,
    technique.name,
    technique.specialAction || "",
    technique.damageModel || "",
    technique.effectId || "",
  ])),
  JSON.stringify([
    ["current-heat", "現在火力", "", "cooking-fixed", ""],
    ["miracle-grill", "ミラクルグリル", "miracle-grill", "", ""],
    ["half-seal", "半熟封じ", "", "cooking-effect", "half-seal"],
    ["full-seal", "完熟封じ", "", "cooking-effect", "full-seal"],
    ["heat-return", "焼き戻し", "", "cooking-effect", "heat-return"],
  ]),
);
assert.equal(
  JSON.stringify(registeredConfig.techniques
    .filter((technique) => technique.showInTechniqueEditor !== false)
    .map((technique) => technique.id)),
  JSON.stringify(["miracle-grill", "half-seal", "full-seal", "heat-return"]),
);
assert.equal(
  JSON.stringify(registeredConfig.techniques
    .filter((technique) => technique.includeInAnalysis !== false)
    .map((technique) => technique.id)),
  JSON.stringify(["current-heat"]),
);
