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
		{ current: "", isGlowing: undefined },
	);

	assert.equal(result.current, 12);
	assert.equal(result.isGlowing, false);
}
