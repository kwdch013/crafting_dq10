const assert = require("node:assert/strict");

globalThis.window = globalThis;
require("../app/crafts/shared/cooking-damage.js");
const engine = require("../app/engine.js");

{
	const result = engine.resolveTechnique(
		{ heat: "normal", traitId: "light" },
		{
			id: "strong",
			damageModel: "cooking-fixed",
			conditionId: "strong",
			multiplier: 1.5,
			criticalMultiplier: 2,
		},
		{ optionId: "center", isGlowing: false },
	);

	assert.equal(result.normalMin, 18);
	assert.equal(result.normalMax, 27);
	assert.equal(result.criticalMin, 36);
	assert.equal(result.criticalMax, 54);
}

{
	const result = engine.resolveTechnique(
		{ heat: "normal", traitId: "light" },
		{
			id: "weak",
			damageModel: "cooking-fixed",
			conditionId: "half",
			multiplier: 0.5,
			criticalMultiplier: 2,
		},
		{ optionId: "cross", isGlowing: false },
	);

	assert.equal(result.normalMin, 5);
	assert.equal(result.normalMax, 7);
	assert.equal(result.criticalMin, 10);
	assert.equal(result.criticalMax, 14);
}

{
	const result = engine.resolveTechnique(
		{ heat: "strong", traitId: "light" },
		{
			id: "aim",
			damageModel: "cooking-fixed",
			conditionId: null,
			multiplier: 1,
			criticalMultiplier: 2,
		},
		{ optionId: "corner", isGlowing: false },
	);

	assert.equal(result.normalMin, 5);
	assert.equal(result.normalMax, 7);
	assert.equal(result.criticalMin, 10);
	assert.equal(result.criticalMax, 14);
}

{
	const result = engine.resolveTechnique(
		{ heat: "strong", traitId: "light" },
		{
			id: "aim",
			damageModel: "cooking-fixed",
			conditionId: null,
			multiplier: 1,
			criticalMultiplier: 2,
		},
		{ optionId: "corner", isGlowing: true },
	);

	assert.equal(result.normalMin, 36);
	assert.equal(result.normalMax, 54);
	assert.equal(result.criticalMin, 72);
	assert.equal(result.criticalMax, 108);
}

{
	const result = engine.resolveTechnique(
		{ heat: "normal", traitId: "light-return", cookingEffectMode: "cross-glow" },
		{
			id: "basic",
			damageModel: "cooking-fixed",
			conditionId: null,
			multiplier: 1,
			criticalMultiplier: 2,
		},
		{ optionId: "cross", isGlowing: false },
	);

	assert.equal(result.normalMin, 24);
	assert.equal(result.normalMax, 36);
	assert.equal(result.criticalMin, 48);
	assert.equal(result.criticalMax, 72);
}

{
	const result = engine.resolveCriticalLockJudgement(
		{ optionId: "center", isGlowing: true },
		72,
		{ heat: "strong", traitId: "light" },
	);

	assert.equal(result.lockJudgement, "possible-fake-critical");
	assert.equal(result.lockJudgementLabel, "偽会心の可能性あり");
}
