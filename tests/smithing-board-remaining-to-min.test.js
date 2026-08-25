const assert = require("node:assert/strict");
const fs = require("node:fs");

// 鍛冶BOARDで、現在ダメージと合わせて基準下限までの残りダメージを小さく併記する機能を検証します。
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.match(
  mainJs,
  /function formatSmithingRemainingToMin\(item\)/,
  "基準下限までの残りダメージを整形する関数を追加してください",
);
assert.match(
  mainJs,
  /component\.craftFamily === "smithing" \? formatSmithingRemainingToMin\(item\) : ""/,
  "鍛冶BOARDのマスにだけ残りダメージ表示を追加してください",
);

const fn = mainJs.match(/function formatSmithingRemainingToMin\(item\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(fn, "formatSmithingRemainingToMin の本体を取得できませんでした");
assert.match(fn, /item\.lowerDiff > 0/, "残りダメージがある場合の分岐を実装してください");
assert.match(fn, /`残り\$\{item\.lowerDiff\}`/, "残りダメージは「残り◯」の形式で表示してください");
assert.match(fn, /基準到達/, "基準下限へ到達済みの場合の表示を実装してください");

// 純粋関数として切り出して実際の挙動も検証します。
function escapeHtml(value) {
  return String(value);
}
// eslint-disable-next-line no-eval
const formatSmithingRemainingToMin = eval(`(${fn.replace("function formatSmithingRemainingToMin", "function")})`);

assert.equal(
  formatSmithingRemainingToMin({ lowerDiff: 12 }),
  '<small class="numeric board-cell-remaining">残り12</small>',
  "残りがある場合は「残り◯」を表示してください",
);
assert.equal(
  formatSmithingRemainingToMin({ lowerDiff: 0 }),
  '<small class="numeric board-cell-remaining">基準到達</small>',
  "基準下限ちょうどの場合は基準到達を表示してください",
);
assert.equal(
  formatSmithingRemainingToMin({ lowerDiff: -5 }),
  '<small class="numeric board-cell-remaining">基準到達</small>',
  "基準下限を超えている場合は基準到達を表示してください",
);
assert.equal(
  formatSmithingRemainingToMin({ lowerDiff: NaN }),
  "",
  "基準下限が不明な場合は何も表示しないでください",
);

console.log("smithing-board-remaining-to-min.test.js OK");
