const assert = require("node:assert/strict");

global.window = global;
require("../app/crafts/shared/sewing-damage.js");

const engine = require("../app/engine.js");
const sewingDamage = global.DQ10SewingDamage;

assert.deepEqual(
	sewingDamage.powerStates.map(({ id, label }) => ({ id, label })),
	[
		{ id: "weak", label: "弱い" },
		{ id: "normal", label: "普通" },
		{ id: "strong", label: "強い" },
		{ id: "strongest", label: "最強" },
		{ id: "critical_x2", label: "会心×2" },
	],
	"ぬいパワーは弱い・普通・強い・最強・会心×2の5種類にしてください",
);

assert.deepEqual(
	sewingDamage.distributions.regenerate.regenerate,
	[
		{ value: -12, percent: 20 },
		{ value: -13, percent: 20 },
		{ value: -14, percent: 20 },
		{ value: -15, percent: 20 },
		{ value: -16, percent: 20 },
	],
	"再生布をぬいパワーから分離しても回復分布は保持してください",
);
assert.deepEqual(
	sewingDamage.actions.regenerate,
	{ label: "再生", multiplier: -1 },
	"再生アクションの定義は保持してください",
);

assert.equal(
	Object.hasOwn(sewingDamage.distributions, "critical_x2"),
	false,
	"会心×2専用の分布データを二重定義しないでください",
);

Object.keys(sewingDamage.distributions.normal).forEach((actionId) => {
	assert.strictEqual(
		sewingDamage.getDistribution("critical_x2", actionId),
		sewingDamage.distributions.normal[actionId],
		`${actionId}の会心×2分布は普通と同じ参照を返してください`,
	);
	assert.deepEqual(
		sewingDamage.getRange("critical_x2", actionId),
		sewingDamage.getRange("normal", actionId),
		`${actionId}の会心×2ダメージ範囲は普通と同一にしてください`,
	);
});

{
	const technique = {
		id: "sew",
		damageModel: "sewing-power",
		actionId: "sew",
		criticalMultiplier: 2,
		criticalWeight: 0.8,
	};
	const normal = engine.resolveTechnique(
		{ craftType: "sewing", heat: "normal" },
		technique,
		{},
	);
	const criticalX2 = engine.resolveTechnique(
		{ craftType: "sewing", heat: "critical_x2" },
		technique,
		{},
	);

	assert.strictEqual(criticalX2.distribution, normal.distribution);
	assert.deepEqual(
		[criticalX2.normalMin, criticalX2.normalMax, criticalX2.criticalMin, criticalX2.criticalMax],
		[normal.normalMin, normal.normalMax, normal.criticalMin, normal.criticalMax],
		"右クリック判定とANALYSISで会心×2を普通と同じダメージ範囲として解決してください",
	);
	assert.equal(normal.criticalWeight, 0.8);
	assert.equal(normal.criticalRateBoost, false);
	assert.equal(criticalX2.criticalWeight, 1.6);
	assert.equal(criticalX2.criticalRateBoost, true);
}
