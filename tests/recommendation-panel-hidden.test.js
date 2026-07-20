const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

// 候補手パネルは一時非表示。マークアップは復元できるよう HTML コメントとして残す
const commentedRecommendation = html.match(/<!--[\s\S]*?-->/g)?.some(
  (comment) => comment.includes('id="recommendationList"'),
);
assert.ok(commentedRecommendation, "候補手パネルはコメントアウトして残してください");

// コメント外に候補手のマークアップが残っていないこと (表示されないこと)
const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
assert.ok(
  !htmlWithoutComments.includes('id="recommendationList"'),
  "候補手パネルはコメント外に残さないでください",
);
assert.ok(
  !htmlWithoutComments.includes("<h2>候補手</h2>"),
  "候補手の見出しはコメント外に残さないでください",
);

// 推奨ロジックは残置し、描画先が無い場合のみ表示をスキップする
assert.match(
  mainJs,
  /DQ10CraftEngine\.recommendTechniques\(state\)/,
  "候補手の推奨ロジックは削除しないでください",
);
assert.match(
  mainJs,
  /if \(!elements\.recommendationList\) \{\s*return;\s*\}/,
  "候補手の描画先が無い場合はサマリー更新を壊さずスキップしてください",
);

// サマリー更新は候補手の有無に関わらず先に行う
const summaryUpdateIndex = mainJs.indexOf("elements.dangerCount.textContent");
const recommendationGuardIndex = mainJs.indexOf("if (!elements.recommendationList)");
assert.ok(summaryUpdateIndex >= 0 && recommendationGuardIndex > summaryUpdateIndex,
  "サマリー更新は候補手ガードより前に行ってください");
