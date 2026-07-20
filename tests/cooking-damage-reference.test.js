const assert = require("node:assert/strict");
const fs = require("node:fs");

const cookingComponentJs = fs.readFileSync("app/crafts/cooking/component.js", "utf8");

// renderCookingDamageRanges の本体を抽出します。
const rangesMatch = cookingComponentJs.match(/function renderCookingDamageRanges\([^)]*\) \{([\s\S]*?)\n  \}/);
assert.ok(rangesMatch, "renderCookingDamageRanges が見つかりません");
const body = rangesMatch[1];

// 鍛冶の温度別ダメージと同様の範囲表記「min - max」で描画すること
assert.match(body, /\$\{range\[0\]\} - \$\{range\[1\]\}/, "位置別ダメージは鍛冶と同様の範囲表記 min - max にしてください");

// 分布値の羅列 (12/13/14/... の join) は表示に使わないこと
assert.doesNotMatch(body, /distributions/, "分布値の羅列は表示に使わないでください");
assert.doesNotMatch(body, /getSpecialValues/, "光マスも分布値ではなく範囲を表示してください");
assert.doesNotMatch(body, /values\.join/, "分布値の羅列は表示に使わないでください");

// 範囲値は ranges / specialRanges から取得すること
assert.match(body, /getRange\(/, "位置の範囲は getRange から取得してください");
assert.match(body, /getSpecialRange/, "光マスの範囲は getSpecialRange から取得してください");

// 通常 / 強火焼き / 弱火焼き の3条件を表示すること
assert.match(body, /\["normal", "strong", "half"\]/, "通常・強火焼き・弱火焼きの3条件を表示してください");

// 光マスは4番目の火力分類として位置と同列・同形式で表示すること
assert.doesNotMatch(body, /光マスの火力別ダメージ幅/, "光マスの別枠補足文は廃止してください");
assert.match(
  body,
  /\.\.\.cookingDamage\.positions[\s\S]*\.\.\.\(cookingDamage\.specialRanges \|\| \[\]\)/,
  "光マスは位置と同列の火力分類として1つの行リストで描画してください",
);
const rowTemplateCount = (body.match(/class="reference-row"/g) || []).length;
assert.equal(rowTemplateCount, 1, "位置と光マスは同一の行テンプレートで描画してください");
