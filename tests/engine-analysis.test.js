const assert = require("node:assert/strict");
const engine = require("../app/engine.js");

global.DQ10SmithingDamage = {
	criticalMultiplier: 2,
	ranges: {
		1000: {
			normal: [12, 18],
			power_2_0: [24, 36],
		},
		1200: {
			power_2_0: [27, 40],
		},
		800: {
			normal: [12, 18],
			power_2_0: [24, 36],
		},
		650: {
			normal: [12, 18],
			power_2_0: [24, 36],
		},
		600: {
			normal: [12, 18],
			power_2_0: [24, 36],
		},
	},
};

{
	const result = engine.analyzeIngredient(
		{
			id: "meat",
			current: 70,
			target: 100,
			successMin: 90,
			successMax: 110,
		},
		{
			id: "aim",
			name: "ねらい焼き",
			normalMin: 6,
			normalMax: 9,
			criticalMin: 18,
			criticalMax: 24,
		},
	);

	assert.equal(result.criticalCanHit, true);
	assert.equal(result.inTargetRangeUnlocked, false);
	assert.equal(result.criticalCanEnterTargetRangeBeforeGuarantee, true);
	assert.equal(result.status, "fake-critical-risk");
	assert.equal(result.statusLabel, "偽会心の可能性あり");
	assert.equal(result.possibleFakeCritical, true);
}

{
	const result = engine.analyzeIngredient(
		{
			id: "meat",
			current: 80,
			target: 105,
			successMin: 90,
			successMax: 120,
		},
		{
			id: "aim",
			name: "ねらい焼き",
			normalMin: 6,
			normalMax: 9,
			criticalMin: 12,
			criticalMax: 18,
		},
		"random-in-range",
	);

	assert.equal(result.criticalCanHit, true);
	assert.equal(result.guaranteedCritical, false);
	assert.equal(result.inTargetRangeUnlocked, false);
	assert.equal(result.criticalCanEnterTargetRangeBeforeGuarantee, true);
	assert.equal(result.possibleFakeCritical, true);
	assert.equal(result.status, "fake-critical-risk");
	assert.equal(result.statusLabel, "偽会心の可能性あり");
}

{
	const result = engine.analyzeIngredient(
		{
			id: "meat",
			current: 80,
			target: 105,
			successMin: 90,
			successMax: 120,
		},
		{
			id: "aim",
			name: "ねらい焼き",
			normalMin: 20,
			normalMax: 23,
			criticalMin: 40,
			criticalMax: 46,
		},
		"random-in-range",
	);

	assert.equal(result.guaranteedCritical, true);
	assert.equal(result.inTargetRangeUnlocked, false);
	assert.equal(result.criticalCanEnterTargetRangeBeforeGuarantee, false);
	assert.equal(result.possibleFakeCritical, false);
	assert.equal(result.status, "guaranteed");
	assert.equal(result.statusLabel, "会心時確定");
}

{
	const result = engine.analyzeIngredient(
		{
			id: "meat",
			current: 101,
			target: 125,
			successMin: 110,
			successMax: 140,
		},
		{
			id: "current-heat",
			name: "現在火力",
			normalMin: 12,
			normalMax: 18,
			criticalMin: 24,
			criticalMax: 36,
		},
		"random-in-range",
	);

	assert.equal(result.targetDiff, 24);
	assert.equal(result.guaranteedCritical, true);
	assert.equal(result.criticalCanEnterTargetRangeBeforeGuarantee, false);
	assert.equal(result.status, "guaranteed");
}

{
	const result = engine.analyzeIngredient(
		{
			id: "meat",
			current: 118,
			target: 125,
			successMin: 110,
			successMax: 140,
		},
		{
			id: "current-heat",
			name: "現在火力",
			normalMin: 3,
			normalMax: 8,
			criticalMin: 6,
			criticalMax: 16,
		},
		"random-in-range",
	);

	assert.equal(result.targetDiff, 7);
	assert.equal(result.normalOver, false);
	assert.equal(result.status, "in-range");
	assert.equal(result.statusLabel, "基準内");
}

{
	const result = engine.analyzeIngredient(
		{
			id: "meat",
			current: 117,
			target: 105,
			successMin: 90,
			successMax: 120,
		},
		{
			id: "basic",
			name: "このまま焼く",
			normalMin: 3,
			normalMax: 5,
			criticalMin: 1,
			criticalMax: 2,
		},
		"random-in-range",
	);

	assert.equal(result.status, "normal-over-risk");
	assert.equal(result.statusLabel, "通常時超過の可能性あり");
}

{
	const result = engine.analyzeIngredient(
		{
			id: "meat",
			current: 121,
			target: 105,
			successMin: 90,
			successMax: 120,
		},
		{
			id: "basic",
			name: "このまま焼く",
			normalMin: 3,
			normalMax: 5,
			criticalMin: 6,
			criticalMax: 10,
		},
		"random-in-range",
	);

	assert.equal(result.status, "over");
	assert.equal(result.statusLabel, "超過中");
}

{
	const technique = {
		id: "light-strong",
		name: "光・強火",
		normalMin: 27,
		normalMax: 54,
		criticalMin: 54,
		criticalMax: 108,
	};
	const baseIngredient = {
		id: "meat",
		target: 125,
		successMin: 110,
		successMax: 140,
	};

	const shortage = engine.analyzeIngredient(
		{ ...baseIngredient, current: 1 },
		technique,
		"random-in-range",
	);
	const fakeMin = engine.analyzeIngredient(
		{ ...baseIngredient, current: 2 },
		technique,
		"random-in-range",
	);
	const fakeMax = engine.analyzeIngredient(
		{ ...baseIngredient, current: 85 },
		technique,
		"random-in-range",
	);
	const guaranteedMin = engine.analyzeIngredient(
		{ ...baseIngredient, current: 86 },
		technique,
		"random-in-range",
	);
	const guaranteedMax = engine.analyzeIngredient(
		{ ...baseIngredient, current: 110 },
		technique,
		"random-in-range",
	);

	assert.equal(shortage.status, "shortage");
	assert.equal(fakeMin.criticalCanEnterTargetRangeBeforeGuarantee, true);
	assert.equal(fakeMin.status, "fake-critical-risk");
	assert.equal(fakeMax.criticalCanEnterTargetRangeBeforeGuarantee, false);
	assert.equal(fakeMax.status, "guaranteed");
	assert.equal(guaranteedMin.criticalCanEnterTargetRangeBeforeGuarantee, false);
	assert.equal(guaranteedMin.status, "guaranteed");
	assert.equal(guaranteedMax.inTargetRangeUnlocked, true);
	assert.equal(guaranteedMax.criticalCanEnterTargetRangeBeforeGuarantee, false);
	assert.equal(guaranteedMax.status, "normal-over-risk");
}

{
	const result = engine.analyzeIngredient(
		{
			id: "meat",
			current: 111,
			target: 125,
			successMin: 110,
			successMax: 140,
		},
		{
			id: "range-unlocked",
			name: "基準範囲内未固定",
			normalMin: 0,
			normalMax: 0,
			criticalMin: 1,
			criticalMax: 2,
		},
		"random-in-range",
	);

	assert.equal(result.inTargetRangeUnlocked, true);
	assert.equal(result.guaranteedCritical, false);
	assert.equal(result.possibleFakeCritical, false);
	assert.equal(result.status, "in-range");
	assert.equal(result.statusLabel, "基準内");
}

{
	const technique = {
		id: "priority-rule",
		name: "優先順位確認",
		normalMin: 6,
		normalMax: 8,
		criticalMin: 12,
		criticalMax: 16,
	};
	const baseIngredient = {
		id: "meat",
		target: 115,
		successMin: 100,
		successMax: 130,
	};

	const over = engine.analyzeIngredient(
		{ ...baseIngredient, current: 131 },
		technique,
		"random-in-range",
	);
	const shortage = engine.analyzeIngredient(
		{ ...baseIngredient, current: 83 },
		technique,
		"random-in-range",
	);
	const normalOverRisk = engine.analyzeIngredient(
		{ ...baseIngredient, current: 125 },
		technique,
		"random-in-range",
	);
	const guaranteed = engine.analyzeIngredient(
		{ ...baseIngredient, current: 88 },
		technique,
		"random-in-range",
	);
	const fakeByCriticalRange = engine.analyzeIngredient(
		{ ...baseIngredient, current: 85 },
		technique,
		"random-in-range",
	);
	const lowerBoundary = engine.analyzeIngredient(
		{ ...baseIngredient, current: 100 },
		technique,
		"random-in-range",
	);
	const upperBoundary = engine.analyzeIngredient(
		{ ...baseIngredient, current: 130 },
		{ ...technique, normalMin: 0, normalMax: 0, criticalMin: 0, criticalMax: 0 },
		"random-in-range",
	);
	const shortageBoundary = engine.analyzeIngredient(
		{ ...baseIngredient, current: 84 },
		technique,
		"random-in-range",
	);
	const normalOverBoundary = engine.analyzeIngredient(
		{ ...baseIngredient, current: 122 },
		technique,
		"random-in-range",
	);
	const locked = engine.analyzeIngredient(
		{ ...baseIngredient, current: 100, locked: true },
		technique,
		"random-in-range",
	);

	assert.equal(over.status, "over");
	assert.equal(shortage.status, "shortage");
	assert.equal(normalOverRisk.status, "normal-over-risk");
	assert.equal(guaranteed.status, "fake-critical-risk");
	assert.equal(fakeByCriticalRange.status, "fake-critical-risk");
	assert.equal(lowerBoundary.status, "in-range");
	assert.equal(upperBoundary.status, "in-range");
	assert.equal(shortageBoundary.status, "fake-critical-risk");
	assert.equal(normalOverBoundary.status, "in-range");
	assert.equal(locked.status, "locked");
	assert.equal(locked.normalAfterMin, 100);
	assert.equal(locked.criticalAfterMax, 100);
}

{
	const result = engine.analyzeIngredient(
		{
			id: "meat",
			current: 100,
			target: 100,
			successMin: 90,
			successMax: 110,
			locked: true,
			lockJudgement: "possible-fake-critical",
		},
		{
			id: "aim",
			name: "ねらい焼き",
			normalMin: 6,
			normalMax: 9,
			criticalMin: 24,
			criticalMax: 36,
		},
	);

	assert.equal(result.status, "locked");
	assert.equal(result.statusLabel, "固定");
}

{
	const fakeCriticalLabels = Object.values(engine.statusLabels).filter(
		(label) => label === "偽会心の可能性あり",
	);

	assert.deepEqual(Object.keys(engine.statusLabels).sort(), [
		"fake-critical-risk",
		"gauge-entry",
		"guaranteed",
		"in-range",
		"locked",
		"locked-critical",
		"normal-over-risk",
		"over",
		"shortage",
	]);
	assert.equal(fakeCriticalLabels.length, 1);
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			targetMode: "random-in-range",
			techniques: [],
		},
		{
			current: 70,
			target: 85,
			successMin: 80,
			successMax: 95,
		},
	);

	assert.equal(result.status, "gauge-entry");
	assert.equal(result.statusLabel, "ゲージ突入");
	assert.equal(result.normalMaxCanEnterTargetRange, true);
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			targetMode: "random-in-range",
			techniques: [],
		},
		{
			current: 61,
			target: 85,
			successMin: 80,
			successMax: 95,
		},
	);

	assert.equal(result.status, "guaranteed");
	assert.equal(result.statusLabel, "本会心！");
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			targetMode: "random-in-range",
			techniques: [],
		},
		{
			current: 58,
			target: 85,
			successMin: 80,
			successMax: 95,
		},
	);

	assert.equal(result.status, "fake-critical-risk");
	assert.equal(result.statusLabel, "偽会心の可能性あり");
	assert.equal(result.guaranteedCritical, false);
	assert.equal(result.criticalCanEnterTargetRangeBeforeGuarantee, true);
}

{
	const result = engine.resolveTechnique(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "light",
		},
		{
			id: "double",
			damageModel: "smithing-temperature",
			powerId: "power_2_0",
			criticalMultiplier: 2,
		},
		{
			isGlowing: true,
		},
	);

	assert.equal(result.normalMin, 48);
	assert.equal(result.normalMax, 72);
	assert.equal(result.criticalMin, 96);
	assert.equal(result.criticalMax, 144);
}

{
	const result = engine.resolveTechnique(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "light",
		},
		{
			id: "double",
			damageModel: "smithing-temperature",
			powerId: "power_2_0",
			criticalMultiplier: 2,
		},
		{
			isGlowing: false,
		},
	);

	assert.equal(result.normalMin, 24);
	assert.equal(result.normalMax, 36);
	assert.equal(result.criticalMin, 48);
	assert.equal(result.criticalMax, 72);
}

{
	const baseTechnique = {
		id: "hit",
		damageModel: "smithing-temperature",
		powerId: "normal",
		focusCost: 8,
		criticalMultiplier: 2,
		criticalWeight: 1,
	};
	const doubled = engine.resolveTechnique(
		{ craftType: "weapon-smithing", heat: "800", traitId: "double-half" },
		baseTechnique,
		{},
	);
	const halved = engine.resolveTechnique(
		{ craftType: "weapon-smithing", heat: "600", traitId: "double-half" },
		baseTechnique,
		{},
	);
	const normal = engine.resolveTechnique(
		{ craftType: "weapon-smithing", heat: "650", traitId: "double-half" },
		baseTechnique,
		{},
	);

	assert.equal(doubled.normalMin, 24);
	assert.equal(doubled.normalMax, 36);
	assert.equal(doubled.focusCost, 8);
	assert.equal(halved.normalMin, 6);
	assert.equal(halved.normalMax, 9);
	assert.equal(normal.normalMin, 12);
	assert.equal(normal.normalMax, 18);
}

{
	const baseTechnique = {
		id: "double",
		damageModel: "smithing-temperature",
		powerId: "power_2_0",
		focusCost: 8,
		criticalMultiplier: 2,
		criticalWeight: 1,
	};
	const reduced = engine.resolveTechnique(
		{ craftType: "weapon-smithing", heat: "800", traitId: "focus-change" },
		baseTechnique,
		{},
	);
	const increased = engine.resolveTechnique(
		{ craftType: "weapon-smithing", heat: "600", traitId: "focus-change" },
		baseTechnique,
		{},
	);

	assert.equal(reduced.focusCost, 4);
	assert.equal(reduced.normalMin, 24);
	assert.equal(reduced.normalMax, 36);
	assert.equal(reduced.criticalRateBoost, false);
	assert.equal(increased.focusCost, 12);
	assert.equal(increased.normalMin, 24);
	assert.equal(increased.normalMax, 36);
	assert.equal(increased.criticalRateBoost, true);
	assert.equal(increased.criticalWeight, 1.5);
}

assert.equal(engine.isSmithingReturnNextTurn({ craftType: "weapon-smithing", traitId: "return", heat: "250" }), true);
assert.equal(engine.isSmithingReturnNextTurn({ craftType: "weapon-smithing", traitId: "return", heat: "450" }), true);
assert.equal(engine.isSmithingReturnNextTurn({ craftType: "weapon-smithing", traitId: "return", heat: "200" }), false);
assert.equal(engine.isSmithingReturnNextTurn({ craftType: "weapon-smithing", traitId: "light", heat: "250" }), false);

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			targetMode: "random-in-range",
			techniques: [
				{
					id: "hit",
					damageModel: "smithing-temperature",
					powerId: "normal",
					criticalMultiplier: 2,
				},
			],
		},
		{
			current: 78,
			target: 85,
			successMin: 80,
			successMax: 95,
		},
	);

	assert.equal(result.technique.id, "board-normal");
	assert.equal(result.normalMin, 12);
	assert.equal(result.normalMax, 18);
	assert.equal(result.status, "normal-over-risk");
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			targetMode: "random-in-range",
			techniques: [
				{
					id: "hit",
					damageModel: "smithing-temperature",
					powerId: "normal",
					criticalMultiplier: 2,
				},
			],
		},
		{
			current: 85,
			target: 85,
			successMin: 80,
			successMax: 95,
			locked: true,
		},
	);

	assert.equal(result.status, "locked");
	assert.equal(result.statusLabel, "確定済み");
	assert.equal(result.normalMin, 0);
	assert.equal(result.normalMax, 0);
}

{
	const result = engine.resolveTechnique(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			specialChargeState: "using",
		},
		{
			id: "hit",
			damageModel: "smithing-temperature",
			powerId: "normal",
			focusCost: 5,
			criticalMultiplier: 2,
		},
		{
			current: 40,
			target: 100,
			successMin: 90,
			successMax: 110,
		},
	);

	assert.equal(result.hephaestusActive, true);
	assert.equal(result.forcedCritical, true);
	assert.equal(result.normalMin, 24);
	assert.equal(result.normalMax, 36);
	assert.equal(result.criticalMin, 24);
	assert.equal(result.criticalMax, 36);
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			specialChargeState: "using",
			targetMode: "random-in-range",
			techniques: [],
		},
		{
			current: 40,
			target: 100,
			successMin: 90,
			successMax: 110,
		},
	);

	assert.equal(result.technique.id, "board-normal");
	assert.equal(result.hephaestusActive, true);
	assert.equal(result.forcedCritical, true);
	assert.equal(result.normalMin, 24);
	assert.equal(result.normalMax, 36);
	assert.equal(result.criticalMin, 24);
	assert.equal(result.criticalMax, 36);
	assert.equal(result.status, "shortage");
	assert.equal(result.statusLabel, "不足");
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			specialChargeState: "using",
			targetMode: "random-in-range",
			techniques: [],
		},
		{
			current: 70,
			target: 100,
			successMin: 90,
			successMax: 110,
		},
	);

	assert.equal(result.guaranteedCritical, false);
	assert.equal(result.possibleFakeCritical, true);
	assert.equal(result.statusLabel, "偽会心の可能性あり");
}

{
	const result = engine.resolveTechnique(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			specialChargeState: "using",
		},
		{
			id: "hit",
			damageModel: "smithing-temperature",
			powerId: "normal",
			focusCost: 5,
			criticalMultiplier: 2,
		},
		{
			current: 100,
			target: 100,
			successMin: 90,
			successMax: 110,
		},
	);

	assert.equal(result.hephaestusNoDamage, true);
	assert.equal(result.normalMin, 0);
	assert.equal(result.normalMax, 0);
	assert.equal(result.criticalMin, 0);
	assert.equal(result.criticalMax, 0);
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			specialChargeState: "using",
			targetMode: "random-in-range",
			techniques: [],
		},
		{
			current: 95,
			target: 100,
			successMin: 90,
			successMax: 110,
		},
	);

	assert.equal(result.hephaestusNoDamage, false);
	assert.equal(result.normalMin, 5);
	assert.equal(result.normalMax, 5);
	assert.equal(result.normalOver, false);
	assert.equal(result.statusLabel, "基準内");
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			specialChargeState: "using",
			targetMode: "random-in-range",
			techniques: [],
		},
		{
			current: 86,
			target: 100,
			successMin: 90,
			successMax: 110,
		},
	);

	assert.equal(result.guaranteedCritical, true);
	assert.equal(result.possibleFakeCritical, false);
	assert.equal(result.statusLabel, "本会心！");
}

{
	const result = engine.analyzeIngredientAcrossTechniques(
		{
			craftType: "weapon-smithing",
			heat: "1000",
			traitId: "none",
			specialChargeState: "using",
			targetMode: "random-in-range",
			techniques: [],
		},
		{
			current: 68,
			target: 100,
			successMin: 90,
			successMax: 110,
		},
	);

	assert.equal(result.guaranteedCritical, false);
	assert.equal(result.possibleFakeCritical, true);
	assert.equal(result.statusLabel, "偽会心の可能性あり");
}
