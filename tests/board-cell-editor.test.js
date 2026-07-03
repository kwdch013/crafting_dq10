const assert = require("node:assert/strict");

const editor = require("../app/board-cell-editor.js");

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
