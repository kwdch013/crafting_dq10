const assert = require("node:assert/strict");
const engine = require("../app/engine.js");

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
	assert.equal(fakeMax.criticalCanEnterTargetRangeBeforeGuarantee, true);
	assert.equal(fakeMax.status, "fake-critical-risk");
	assert.equal(guaranteedMin.criticalCanEnterTargetRangeBeforeGuarantee, false);
	assert.equal(guaranteedMin.status, "guaranteed");
	assert.equal(guaranteedMax.inTargetRangeUnlocked, true);
	assert.equal(guaranteedMax.criticalCanEnterTargetRangeBeforeGuarantee, false);
	assert.equal(guaranteedMax.status, "guaranteed");
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
	assert.equal(result.possibleFakeCritical, true);
	assert.equal(result.status, "fake-critical-risk");
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

	assert.equal(result.status, "fake-critical-risk");
	assert.equal(result.statusLabel, "偽会心の可能性あり");
}

{
	const fakeCriticalLabels = Object.values(engine.statusLabels).filter(
		(label) => label === "偽会心の可能性あり",
	);

	assert.deepEqual(Object.keys(engine.statusLabels).sort(), [
		"fake-critical-risk",
		"guaranteed",
		"locked",
		"locked-critical",
		"normal-over-risk",
		"over",
		"shortage",
	]);
	assert.equal(fakeCriticalLabels.length, 1);
}
