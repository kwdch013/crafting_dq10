const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function createButton() {
	const classes = new Set();
	const listeners = {};

	return {
		attributes: {},
		dataset: {},
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
		addEventListener(name, listener) {
			listeners[name] = listener;
		},
		click() {
			listeners.click?.();
		},
		setAttribute(name, value) {
			this.attributes[name] = value;
		},
	};
}

function createButtonContainer() {
	return {
		children: [],
		append(child) {
			this.children.push(child);
		},
		replaceChildren() {
			this.children = [];
		},
	};
}

const context = {
	window: {},
	document: {
		createElement() {
			return createButton();
		},
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
	const selectedPowers = [];
	const elements = {
		sewingPowerButtons: createButtonContainer(),
	};

	component.renderPowerControls({
		state: { heat: "strong" },
		elements,
		onPowerChange(powerId) {
			selectedPowers.push(powerId);
		},
	});

	assert.deepEqual(
		elements.sewingPowerButtons.children.map((button) => button.dataset.sewingPowerId),
		Array.from(powerStates, (powerState) => powerState.id),
		"BOARDボタンのidはDQ10SewingDamage.powerStatesを使ってください",
	);
	assert.deepEqual(
		elements.sewingPowerButtons.children.map((button) => button.textContent),
		Array.from(powerStates, (powerState) => powerState.label),
		"BOARDボタンのラベルはDQ10SewingDamage.powerStatesを使ってください",
	);
	assert.deepEqual(
		elements.sewingPowerButtons.children
			.filter((button) => button.classList.contains("active"))
			.map((button) => button.dataset.sewingPowerId),
		["strong"],
		"現在のぬいパワーだけをactive表示してください",
	);
	assert.equal(
		elements.sewingPowerButtons.children[2].attributes["aria-pressed"],
		"true",
		"選択状態を支援技術にも伝えてください",
	);

	const regenerateButton = elements.sewingPowerButtons.children.find(
		(button) => button.dataset.sewingPowerId === "regenerate",
	);
	regenerateButton.click();
	assert.deepEqual(selectedPowers, ["regenerate"]);
}

{
	const state = { heat: "normal" };
	const elements = {
		heatInput: { value: "normal" },
	};

	component.applyHeatChange({ state, elements }, "strongest");

	assert.equal(state.heat, "strongest", "BOARD選択をstate.heatへ同期してください");
	assert.equal(elements.heatInput.value, "strongest", "BOARD選択を基本設定プルダウンへ同期してください");
}

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.match(
	html,
	/class="command-group sewing-only-command"[^>]*hidden[\s\S]*id="sewingPowerButtons"/,
	"BOARD周辺に初期非表示の裁縫専用ぬいパワー領域を用意してください",
);
assert.match(
	html,
	/class="command-group special-only-command"/,
	"裁縫で必殺操作を表示しないよう、調理・鍛冶専用グループとして識別してください",
);
assert.match(
	mainJs,
	/sewingPowerButtons: document\.querySelector\("#sewingPowerButtons"\)/,
	"ぬいパワーボタン領域を画面要素として参照してください",
);
assert.match(
	mainJs,
	/showsCommandPanel = supportsSpecial \|\| isSewing/,
	"裁縫選択時にもBOARDコマンド領域を表示してください",
);
assert.match(
	mainJs,
	/elements\.sewingOnlyCommandGroups[\s\S]*element\.hidden = !isSewing/,
	"裁縫専用領域は裁縫以外で非表示にしてください",
);
assert.match(
	mainJs,
	/elements\.specialOnlyCommandGroups[\s\S]*element\.hidden = !supportsSpecial/,
	"裁縫選択時は調理・鍛冶用の必殺操作を非表示にしてください",
);
assert.match(
	mainJs,
	/function changeSewingPowerFromBoard\(nextPowerId\)[\s\S]*applySmithingHeatChange\(nextPowerId\)[\s\S]*refreshAfterHeatChange\(\)/,
	"BOARDでのぬいパワー変更後に基本設定同期と依存表示の再描画を行ってください",
);
const refreshAfterHeatChange = mainJs.match(
	/function refreshAfterHeatChange\(\) \{([\s\S]*?)\n\}/,
);
assert.ok(refreshAfterHeatChange, "状態変更後の再描画処理を定義してください");
assert.match(
	refreshAfterHeatChange[1],
	/renderSewingPowerControls\(\)[\s\S]*renderOpenBoardCellJudgements\(\)/,
	"基本設定側の変更時にもBOARDのactive表示と右クリック判定を同期してください",
);
assert.match(
	mainJs,
	/function renderOpenBoardCellJudgements\(\)[\s\S]*renderCraftCellJudgements\(boardCellEditorElement\)/,
	"ぬいパワー変更時は開いている右クリック判定表示も更新してください",
);
