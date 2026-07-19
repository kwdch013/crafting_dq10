const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function createElement() {
	const listeners = {};

	return {
		children: [],
		dataset: {},
		textContent: "",
		value: "",
		append(child) {
			this.children.push(child);
		},
		replaceChildren() {
			this.children = [];
		},
		addEventListener(name, listener) {
			listeners[name] = listener;
		},
		setAttribute() {},
		classList: { toggle() {} },
	};
}

const context = {
	window: {},
	document: {
		createElement,
	},
};
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
const powerStates = context.DQ10SewingDamage.powerStates;

{
	const normalized = component.normalizeSavedState({
		craftType: "sewing",
		heat: "normal",
	});
	assert.equal(normalized.sewingNextHeat, "unknown", "旧保存データには次パワーの既定値を補完してください");

	[...powerStates.map(({ id }) => id), "unknown"].forEach((sewingNextHeat) => {
		const restored = component.normalizeSavedState({
			craftType: "sewing",
			heat: "normal",
			sewingNextHeat,
		});
		assert.equal(restored.sewingNextHeat, sewingNextHeat, `${sewingNextHeat}を保存状態から復元してください`);
	});

	const invalid = component.normalizeSavedState({
		craftType: "sewing",
		heat: "normal",
		sewingNextHeat: "regenerate",
	});
	assert.equal(invalid.sewingNextHeat, "unknown", "未対応の次パワーは未定へ正規化してください");
}

{
	const elements = {
		sewingNextPowerSelect: createElement(),
		sewingPowerButtons: createElement(),
	};
	component.renderPowerControls({
		state: { heat: "normal", sewingNextHeat: "strong" },
		elements,
	});

	assert.deepEqual(
		elements.sewingNextPowerSelect.children.map(({ value }) => value),
		[...powerStates.map(({ id }) => id), "unknown"],
		"次パワーは既存の全ぬいパワーと未定を選べるようにしてください",
	);
	assert.deepEqual(
		elements.sewingNextPowerSelect.children.map(({ textContent }) => textContent),
		[...powerStates.map(({ label }) => label), "?"],
		"次パワーのラベルは既存定義を再利用し、未定だけ?としてください",
	);
	assert.equal(elements.sewingNextPowerSelect.value, "strong");
}

{
	const knownState = { heat: "weak", sewingNextHeat: "strong" };
	const knownElements = {
		heatInput: { value: "weak" },
		sewingNextPowerSelect: { value: "strong" },
	};
	assert.equal(component.advancePower({ state: knownState, elements: knownElements }), true);
	assert.deepEqual(knownState, { heat: "strong", sewingNextHeat: "unknown" });
	assert.equal(knownElements.heatInput.value, "strong");
	assert.equal(knownElements.sewingNextPowerSelect.value, "unknown");

	const unknownState = { heat: "weak", sewingNextHeat: "unknown" };
	const unknownElements = {
		heatInput: { value: "weak" },
		sewingNextPowerSelect: { value: "unknown" },
	};
	assert.equal(component.advancePower({ state: unknownState, elements: unknownElements }), false);
	assert.deepEqual(unknownState, { heat: "weak", sewingNextHeat: "unknown" });
}

{
	const strongEntries = component.getCellJudgementEntries({
		heat: "normal",
		sewingNextHeat: "strong",
		sewingRegenerateCloth: true,
	});
	assert.deepEqual(
		JSON.parse(JSON.stringify(strongEntries.find(({ id }) => id === "sew").nextNormalRange)),
		[18, 27],
		"通常特技行へ次パワーの通常ダメージ範囲を付与してください",
	);
	assert.equal(
		Object.hasOwn(strongEntries.find(({ id }) => id === "regenerate"), "nextNormalRange"),
		false,
		"再生行には次パワー範囲を付与しないでください",
	);

	const unknownEntries = component.getCellJudgementEntries({
		heat: "normal",
		sewingNextHeat: "unknown",
	});
	assert.equal(unknownEntries.find(({ id }) => id === "sew").nextNormalRange, null);
}

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.match(
	html,
	/id="sewingNextPowerSelect"[\s\S]*id="sewingAdvancePowerButton"[^>]*>ターン送り<\/button>/,
	"裁縫コマンドへ次パワー選択とターン送りを追加してください",
);
assert.match(
	mainJs,
	/sewingNextHeat: normalizedCraftState\.sewingNextHeat/,
	"正規化した次パワーをstateへ保存してください",
);
assert.match(
	mainJs,
	/function changeSewingNextPowerFromBoard\(\)[\s\S]*state\.sewingNextHeat = elements\.sewingNextPowerSelect\.value[\s\S]*renderOpenBoardCellJudgements\(\)[\s\S]*saveState\(\)/,
	"次パワー選択を判定表示と保存状態へ反映してください",
);
assert.match(
	mainJs,
	/function advanceSewingPower\(\)[\s\S]*component\.advancePower[\s\S]*refreshAfterHeatChange\(\)/,
	"ターン送り後は現在パワー依存の表示を再描画してください",
);
assert.match(
	mainJs,
	/entry\.nextNormalRange[\s\S]*次 \$\{nextRangeLabel\}/,
	"通常特技行へ次パワーの範囲または未確定を描画してください",
);
assert.match(
	mainJs,
	/Object\.hasOwn\(entry, "nextNormalRange"\)[\s\S]*editor-next-damage-range/,
	"次パワー情報を持つ裁縫の通常特技行だけへ次表示を追加してください",
);
assert.match(
	mainJs,
	/elements\.sewingNextPowerSelect\?\.addEventListener\("change", changeSewingNextPowerFromBoard\)/,
	"次パワー選択の変更イベントを接続してください",
);
assert.match(
	mainJs,
	/elements\.sewingAdvancePowerButton\?\.addEventListener\("click", advanceSewingPower\)/,
	"ターン送りボタンのクリックイベントを接続してください",
);
