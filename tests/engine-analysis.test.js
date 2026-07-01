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
	assert.equal(result.status, "critical-candidate");
	assert.equal(result.statusLabel, "会心狙い");
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

	assert.equal(result.status, "locked-fake");
	assert.equal(result.statusLabel, "偽会心の可能性あり");
}
