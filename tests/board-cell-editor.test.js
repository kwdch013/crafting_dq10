const assert = require("node:assert/strict");
const fs = require("node:fs");

const editor = require("../app/board-cell-editor.js");
const mainJs = fs.readFileSync("app/main.js", "utf8");

{
	const result = editor.normalizeEditValue(
		{ current: 12, isGlowing: false },
		{ current: "34", isGlowing: true },
	);

	assert.equal(result.current, 34);
	assert.equal(result.isGlowing, true);
	assert.equal(result.cookingEffectMode, "none");
	assert.equal(result.cookingBlockEffect, "none");
}

{
	const result = editor.normalizeEditValue(
		{ current: 12, isGlowing: true },
		{ current: "abc", isGlowing: false },
	);

	assert.equal(result.current, 12);
	assert.equal(result.isGlowing, false);
}

{
	const result = editor.normalizeEditValue(
		{ current: 12 },
		{ current: "18", cookingEffectMode: "cross-glow" },
	);

	assert.equal(result.current, 18);
	assert.equal(result.cookingEffectMode, "cross-glow");
}

{
	const result = editor.normalizeEditValue(
		{ current: 12 },
		{ current: "18", cookingBlockEffect: "half-seal" },
	);

	assert.equal(result.current, 18);
	assert.equal(result.cookingBlockEffect, "half-seal");
}

{
	const result = editor.normalizeEditValue(
		{ current: 12 },
		{ current: "18", cookingEffectMode: "none" },
	);

	assert.equal(result.current, 18);
	assert.equal(result.cookingEffectMode, "none");
}

{
	const result = editor.normalizeEditValue(
		{ current: 12 },
		{ current: "", isGlowing: undefined, locked: true },
	);

	assert.equal(result.current, 12);
	assert.equal(result.isGlowing, false);
	assert.equal(result.locked, true);
}

{
	const result = editor.normalizeEditValue(
		{ current: 12, locked: true },
		{ current: "12", locked: false },
	);

	assert.equal(result.current, 12);
	assert.equal(result.locked, false);
}

{
	const result = editor.normalizeEditValue(
		{ current: 12, successMin: 20, successMax: 30 },
		{ current: "19", locked: true },
	);

	assert.equal(result.current, 19);
	assert.equal(result.locked, false);
}

{
	const result = editor.normalizeEditValue(
		{ current: 12, successMin: 20, successMax: 30 },
		{ current: "20", locked: true },
	);

	assert.equal(result.current, 20);
	assert.equal(result.locked, true);
}

{
	const result = editor.normalizeEditValue(
		{ current: 12, successMin: 30, successMax: 20 },
		{ current: "30", locked: true },
	);

	assert.equal(result.current, 30);
	assert.equal(result.locked, true);
}

{
	assert.equal(
		editor.resolvePointerDownAction({ isOpen: true, containsTarget: false }),
		"apply",
	);
	assert.equal(
		editor.resolvePointerDownAction({ isOpen: true, containsTarget: true }),
		"none",
	);
	assert.equal(
		editor.resolvePointerDownAction({ isOpen: false, containsTarget: false }),
		"none",
	);
}

assert.match(mainJs, /editor-damage-judgements/, "右クリック編集に職人別ダメージ判定欄を追加してください");
assert.match(mainJs, /function renderCraftCellJudgements\(editor\)/, "木工・裁縫を含む職人別ダメージ判定を描画してください");
assert.match(mainJs, /function getCellJudgementEntries\(ingredient\)/, "職人別の威力別ダメージ候補を取得してください");
assert.match(mainJs, /damageModel: "woodworking-grain"/, "木工の右クリック判定は木目別ダメージを使ってください");
assert.match(mainJs, /damageModel: "sewing-power"/, "裁縫の右クリック判定はぬいパワー別ダメージを使ってください");
