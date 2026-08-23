const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");
const engineJs = fs.readFileSync("app/engine.js", "utf8");
const indexHtml = fs.readFileSync("app/index.html", "utf8");

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
	/getDistribution\(grain, technique\.powerId, \{ wedged: ingredient\?\.isWedged === true \}\)/,
	"木工はくさび状態を反映した参照表の分布を使ってください",
);
assert.match(
	engineJs,
	/"normal-chance": "チャンス!"/,
	"動的な判定結果は「チャンス!」と表示してください",
);
assert.match(
	indexHtml,
	/status-normal-chance fixed-target-only-judgement">チャンス!<\/span>/,
	"判定基準の凡例は「チャンス!」と表示してください",
);
assert.doesNotMatch(
	`${engineJs}\n${indexHtml}`,
	/通常チャンス/,
	"旧判定名の「通常チャンス」をアプリ内に残さないでください",
);
