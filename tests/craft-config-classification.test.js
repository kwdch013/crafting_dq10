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
	"app/crafts/shared/smithing-damage.js",
	"app/crafts/shared/smithing-component.js",
	"app/crafts/shared/sewing-damage.js",
	"app/crafts/shared/woodworking-damage.js",
	"app/crafts/cooking/config.js",
	"app/crafts/weapon-smithing/config.js",
	"app/crafts/armor-smithing/config.js",
	"app/crafts/tool-smithing/config.js",
	"app/crafts/sewing/config.js",
	"app/crafts/woodworking/config.js",
].forEach((file) => {
	vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});

const commonKeys = new Set(context.DQ10CraftSettingSchema.common);
const individualKeys = new Set(context.DQ10CraftSettingSchema.individual);

assert.ok(commonKeys.has("focus"), "集中力設定は共通設定として分類してください");
assert.ok(commonKeys.has("heatStates"), "火力・状態候補は共通設定として分類してください");
assert.ok(individualKeys.has("techniques"), "特技一覧は個別設定として分類してください");
assert.ok(individualKeys.has("recipeCategoryOptions"), "大項目は個別設定として分類してください");

Object.entries(context.DQ10CraftConfigs).forEach(([craftId, config]) => {
	assert.ok(config.settingGroups, `${craftId} に設定分類を付与してください`);
	assert.equal(config.settingGroups.unknown.length, 0, `${craftId} に未分類の設定キーがあります`);
	assert.ok(config.settingGroups.common.includes("focus"), `${craftId} のfocusを共通設定へ分類してください`);
	assert.ok(config.settingGroups.individual.includes("id"), `${craftId} のidを個別設定へ分類してください`);
	assert.ok(config.settingGroups.individual.includes("items"), `${craftId} のitemsを個別設定へ分類してください`);
});

[
	"weapon-smithing",
	"armor-smithing",
	"tool-smithing",
].forEach((craftId) => {
	const config = context.DQ10CraftConfigs[craftId];
	assert.ok(config.settingGroups.common.includes("defaultHeatId"), `${craftId} の初期温度は鍛冶共通設定です`);
	assert.ok(config.settingGroups.common.includes("targetMode"), `${craftId} の基準値モードは鍛冶共通設定です`);
	assert.ok(config.settingGroups.individual.includes("recipeCategoryOptions"), `${craftId} の大項目は職人個別設定です`);
});
