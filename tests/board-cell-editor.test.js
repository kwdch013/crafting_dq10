const assert = require("node:assert/strict");
const fs = require("node:fs");

const editor = require("../app/board-cell-editor.js");
const mainJs = fs.readFileSync("app/main.js", "utf8");
const sewingComponentJs = fs.readFileSync("app/crafts/sewing/component.js", "utf8");

{
	const result = editor.normalizeEditValue(
		{ current: 12, isGlowing: false },
		{ current: "34", isGlowing: true },
	);

	assert.equal(result.current, 34);
	assert.equal(result.isGlowing, true);
	assert.equal(result.cookingEffectMode, "none");
	assert.equal(result.cookingBlockEffect, "none");
	assert.equal(result.isWedged, false);
}

{
	const result = editor.normalizeEditValue(
		{ current: 12, isWedged: false },
		{ current: "12", isWedged: true },
	);

	assert.equal(result.isWedged, true);
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
		editor.resolvePointerDownAction({
			isOpen: true,
			containsTarget: false,
			isToggleTarget: true,
		}),
		"none",
		"切替UIの操作では右クリック編集を確定しないでください",
	);
	assert.equal(
		editor.resolvePointerDownAction({ isOpen: false, containsTarget: false }),
		"none",
	);
}

{
	assert.equal(
		editor.formatJudgementRange(
			{ kind: "recovery" },
			{ normalMin: -16, normalMax: -12, criticalMin: -16, criticalMax: -12 },
		),
		"回復量 -12〜-16",
		"再生行は回復量として表示し、会心欄を含めないでください",
	);
	assert.equal(
		editor.formatJudgementRange(
			{},
			{ normalMin: 12, normalMax: 16, criticalMin: 24, criticalMax: 32 },
		),
		"12-16 / 会心 24-32",
		"通常特技行のダメージ範囲表示は変更しないでください",
	);
}

assert.match(mainJs, /editor-damage-judgements/, "右クリック編集に職人別ダメージ判定欄を追加してください");
assert.match(mainJs, /function renderCraftCellJudgements\(editor\)/, "木工・裁縫を含む職人別ダメージ判定を描画してください");
assert.match(mainJs, /function getCellJudgementEntries\(ingredient\)/, "職人別の威力別ダメージ候補を取得してください");
assert.match(mainJs, /damageModel: "woodworking-grain"/, "木工の右クリック判定は木目別ダメージを使ってください");
assert.match(mainJs, /editor-wedged/, "木工の右クリック編集にくさび切替を追加してください");
assert.match(mainJs, /ingredient\.isWedged = normalized\.isWedged/, "くさび状態をマスへ保存してください");
assert.match(sewingComponentJs, /damageModel: "sewing-power"/, "裁縫の右クリック判定はぬいパワー別ダメージを使ってください");
assert.match(mainJs, /function syncJudgementLegend\(\)/, "判定凡例は職人別に表示を同期してください");
assert.match(mainJs, /fixed-target-only-judgement/, "裁縫・木工専用判定の凡例分類を定義してください");
assert.match(mainJs, /range-target-only-judgement/, "範囲基準職人専用判定の凡例分類を定義してください");
