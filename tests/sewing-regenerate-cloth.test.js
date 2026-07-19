const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function createButton() {
	const classes = new Set();

	return {
		attributes: {},
		classList: {
			contains(name) {
				return classes.has(name);
			},
			toggle(name, active) {
				if (active) {
					classes.add(name);
				} else {
					classes.delete(name);
				}
			},
		},
		setAttribute(name, value) {
			this.attributes[name] = value;
		},
	};
}

const context = { window: {} };
context.window = context;
vm.createContext(context);
[
	"app/crafts/registry.js",
	"app/crafts/shared/sewing-damage.js",
	"app/crafts/sewing/component.js",
].forEach((file) => {
	vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});

const component = context.DQ10CraftComponents.sewing;
const sewingDamage = context.DQ10SewingDamage;

{
	const migrated = component.normalizeSavedState({
		craftType: "sewing",
		heat: "regenerate",
	});

	assert.equal(migrated.heat, "normal", "旧再生布状態は普通のぬいパワーへ移行してください");
	assert.equal(migrated.sewingRegenerateCloth, true, "旧再生布状態は再生布ONへ移行してください");
}

{
	const normalized = component.normalizeSavedState({
		craftType: "sewing",
		heat: "strong",
		sewingRegenerateCloth: false,
	});

	assert.equal(normalized.heat, "strong");
	assert.equal(normalized.sewingRegenerateCloth, false);
}

{
	const state = { heat: "strong", sewingRegenerateCloth: false };
	const elements = { sewingRegenerateClothButton: createButton() };

	component.toggleRegenerateCloth({ state, elements });
	assert.equal(state.sewingRegenerateCloth, true);
	assert.equal(elements.sewingRegenerateClothButton.classList.contains("active"), true);
	assert.equal(elements.sewingRegenerateClothButton.attributes["aria-pressed"], "true");

	component.toggleRegenerateCloth({ state, elements });
	assert.equal(state.sewingRegenerateCloth, false);
	assert.equal(elements.sewingRegenerateClothButton.classList.contains("active"), false);
	assert.equal(elements.sewingRegenerateClothButton.attributes["aria-pressed"], "false");
}

{
	const offEntries = component.getCellJudgementEntries({
		heat: "strong",
		sewingRegenerateCloth: false,
	});
	const onEntries = component.getCellJudgementEntries({
		heat: "strong",
		sewingRegenerateCloth: true,
	});

	assert.equal(offEntries.some((entry) => entry.id === "regenerate"), false);
	assert.equal(onEntries.filter((entry) => entry.id === "regenerate").length, 1);
	assert.deepEqual(
		JSON.parse(JSON.stringify(onEntries.find((entry) => entry.id === "regenerate"))),
		{
			id: "regenerate",
			label: "再生",
			kind: "recovery",
			technique: {
				damageModel: "sewing-power",
				powerId: "regenerate",
				actionId: "regenerate",
				criticalMultiplier: 1,
			},
		},
		"再生行はぬいパワーと独立した回復分布を参照してください",
	);
}

global.window = global;
global.DQ10SewingDamage = sewingDamage;
const engine = require("../app/engine.js");

sewingDamage.powerStates.forEach((powerState) => {
	Object.keys(sewingDamage.actions)
		.filter((actionId) => actionId !== "regenerate")
		.forEach((actionId) => {
			const resolved = engine.resolveTechnique(
				{
					craftType: "sewing",
					heat: powerState.id,
					sewingRegenerateCloth: true,
				},
				{
					damageModel: "sewing-power",
					actionId,
					criticalMultiplier: 2,
				},
				{},
			);

			assert.ok(
				Array.isArray(resolved.distribution),
				`再生布ONの${powerState.label}/${actionId}で分布を解決してください`,
			);
		});
});

{
	const resolved = engine.resolveTechnique(
		{ craftType: "sewing", heat: "strong", sewingRegenerateCloth: true },
		{
			damageModel: "sewing-power",
			powerId: "regenerate",
			actionId: "regenerate",
			criticalMultiplier: 1,
		},
		{},
	);

	assert.deepEqual(
		JSON.parse(JSON.stringify(resolved.distribution)),
		[
			{ value: -12, percent: 20 },
			{ value: -13, percent: 20 },
			{ value: -14, percent: 20 },
			{ value: -15, percent: 20 },
			{ value: -16, percent: 20 },
		],
	);
	assert.deepEqual(
		[resolved.normalMin, resolved.normalMax, resolved.criticalMin, resolved.criticalMax],
		[-16, -12, -16, -12],
	);
}

const mainJs = fs.readFileSync("app/main.js", "utf8");
assert.match(
	mainJs,
	/getCraftComponent\(config\.id\)\.normalizeSavedState\?\.\(value\)/,
	"保存状態の読込時に裁縫コンポーネントの移行処理を呼び出してください",
);
assert.match(
	mainJs,
	/sewingRegenerateCloth: normalizedCraftState\.sewingRegenerateCloth === true/,
	"再生布状態をstateへ保持してください",
);
assert.match(
	mainJs,
	/function toggleSewingRegenerateCloth\(\)[\s\S]*toggleRegenerateCloth[\s\S]*renderOpenBoardCellJudgements\(\)[\s\S]*saveState\(\)/,
	"再生布切替時に判定表示と保存状態を更新してください",
);
assert.match(
	mainJs,
	/elements\.sewingRegenerateClothButton\?\.addEventListener\("click", toggleSewingRegenerateCloth\)/,
	"再生布ボタンの押下でトグル処理を呼び出してください",
);
