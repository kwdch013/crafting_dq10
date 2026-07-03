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
			id: "basic",
			damageModel: "cooking-fixed",
			conditionId: null,
			criticalMultiplier: 2,
		},
		{ optionId: "corner", cookingBlockEffect: "half-seal" },
	);

	assert.equal(result.normalMin, 2);
	assert.equal(result.normalMax, 3);
	assert.equal(result.criticalMin, 3);
	assert.equal(result.criticalMax, 5);
}

{
	const result = engine.resolveTechnique(
		{ heat: "strong", traitId: "light" },
		{
			id: "basic",
			damageModel: "cooking-fixed",
			conditionId: null,
			criticalMultiplier: 2,
		},
		{ optionId: "center", cookingBlockEffect: "full-seal" },
	);

	assert.equal(result.normalMin, 0);
	assert.equal(result.normalMax, 0);
	assert.equal(result.criticalMin, 0);
	assert.equal(result.criticalMax, 0);
}

{
	const result = engine.resolveTechnique(
		{
			heat: "normal",
			traitId: "light",
			cookingCellEffects: [{ row: 1, column: 1, effectId: "heat-return", remainingTurns: 4 }],
		},
		{
			id: "basic",
			damageModel: "cooking-fixed",
			conditionId: null,
			criticalMultiplier: 2,
		},
		{ optionId: "corner", gridCell: { row: 1, column: 1 } },
	);

	assert.equal(result.normalMin, -5);
	assert.equal(result.normalMax, -3);
	assert.equal(result.criticalMin, -10);
	assert.equal(result.criticalMax, -6);
}

{
	const result = engine.resolveTechnique(
		{
			heat: "normal",
			traitId: "light",
			cookingCellEffects: [{ row: 1, column: 1, effectId: "heat-return", remainingTurns: 4 }],
		},
		{
			id: "basic",
			damageModel: "cooking-fixed",
			conditionId: null,
			criticalMultiplier: 2,
		},
		{ optionId: "center", gridCell: { row: 2, column: 2 } },
	);

	assert.equal(result.normalMin, 12);
	assert.equal(result.normalMax, 18);
	assert.equal(result.criticalMin, 24);
	assert.equal(result.criticalMax, 36);
}

{
	const result = engine.resolveTechnique(
		{
			heat: "normal",
			traitId: "light",
			cookingCellEffects: [{ row: 1, column: 1, effectId: "heat-return", remainingTurns: 4 }],
		},
		{
			id: "basic",
			damageModel: "cooking-fixed",
			conditionId: null,
			criticalMultiplier: 2,
		},
		{ optionId: "corner", gridCell: { row: 1, column: 1 }, cookingBlockEffect: "full-seal" },
	);

	assert.equal(result.normalMin, 0);
	assert.equal(result.normalMax, 0);
	assert.equal(result.criticalMin, 0);
	assert.equal(result.criticalMax, 0);
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
	assert.equal(result.normalMax, 56);
	assert.equal(result.criticalMin, 72);
	assert.equal(result.criticalMax, 112);
	assert.deepEqual(globalThis.DQ10CookingDamage.getSpecialValues("light", "normal"), [24, 26, 28, 30, 32, 34, 36]);
	assert.deepEqual(globalThis.DQ10CookingDamage.getSpecialValues("light", "strong"), [36, 39, 42, 45, 48, 51, 56]);
	assert.deepEqual(globalThis.DQ10CookingDamage.getSpecialValues("light", "half"), [18, 20, 21, 23, 24, 26, 27]);
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

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			heat: "strong",
			traitId: "light",
			targetMode: "random-in-range",
			techniques: [
				{
					id: "current-heat",
					name: "現在火力",
					damageModel: "cooking-fixed",
					conditionId: null,
					criticalMultiplier: 2,
					recommendable: false,
				},
				{
					id: "miracle-grill",
					name: "ミラクルグリル",
					specialAction: "miracle-grill",
					includeInAnalysis: false,
				},
			],
		},
		{
			optionId: "center",
			isGlowing: false,
			current: 70,
			target: 125,
			successMin: 110,
			successMax: 140,
		},
	);

	assert.equal(result.techniqueAnalyses.length, 1);
	assert.equal(result.techniqueAnalyses[0].technique.id, "current-heat");
	assert.equal(result.normalMin, 18);
	assert.equal(result.normalMax, 27);
	assert.equal(result.criticalMin, 36);
	assert.equal(result.criticalMax, 54);
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			heat: "strong",
			traitId: "light",
			targetMode: "random-in-range",
			techniques: [
				{
					id: "current-heat",
					name: "現在火力",
					damageModel: "cooking-fixed",
					conditionId: null,
					criticalMultiplier: 2,
					recommendable: false,
				},
			],
		},
		{
			optionId: "cross",
			isGlowing: true,
			current: 0,
			target: 195,
			successMin: 180,
			successMax: 210,
		},
	);

	assert.equal(result.normalMin, 36);
	assert.equal(result.normalMax, 56);
	assert.equal(result.criticalMin, 72);
	assert.equal(result.criticalMax, 112);
	assert.equal(result.status, "shortage");
	assert.equal(result.statusLabel, "不足");
}
