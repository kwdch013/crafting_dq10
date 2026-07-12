const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");
const engineJs = fs.readFileSync("app/engine.js", "utf8");

assert.match(
	mainJs,
	/function formatDamageDistribution\(distribution/,
	"木工・裁縫の特技ごとの値別確率を整形してください",
);
assert.match(
	mainJs,
	/tech-distribution/,
	"特技データカードに値別確率の表示先を追加してください",
);
assert.match(
	mainJs,
	/formatDamageDistribution\(resolvedTechnique\.distribution\)/,
	"特技データカードでは解決済み特技の分布を表示してください",
);
assert.match(
	mainJs,
	/formatDamageDistribution\(resolvedTechnique\.distribution[,)][\s\S]*filter\(Boolean\)/,
	"右クリック判定では解決済み特技の分布を表示してください(analysisにtechniqueは無い)",
);
assert.match(
	mainJs,
	/"█"/,
	"値別発生率はバーで視認しやすく整形してください",
);
assert.match(
	mainJs,
	/function formatDamageDistribution\(distribution, options = \{\}\)/,
	"基準値ちょうどへ到達する値を強調するため、targetValueを受け取れるようにしてください",
);
assert.match(
	mainJs,
	/formatDamageDistribution\(resolvedTechnique\.distribution, \{ targetValue: analysis\.targetDiff \}\)/,
	"右クリック判定では基準値ちょうどへ到達する値(targetDiff)を強調してください",
);
assert.match(
	mainJs,
	/基準値/,
	"基準値ちょうどへ到達する行にはマーカーを付けてください",
);
assert.doesNotMatch(
	mainJs,
	/analysis\.technique\.distribution/,
	"analyzeIngredientの戻り値にtechniqueは無いため参照しないでください",
);
assert.match(
	engineJs,
	/getRepeatedDistribution\(grain, technique\.powerId, repeat\)/,
	"木工の複数回削りは合算後の分布を使ってください",
);
