const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

const basicSettingsIndex = html.indexOf("<h2>基本設定</h2>");
const traitInfoIndex = html.indexOf('id="traitInfoPanel"');
const techniqueIndex = html.indexOf("<h2>特技データ</h2>");

assert.ok(basicSettingsIndex >= 0, "基本設定パネルを表示してください");
assert.ok(traitInfoIndex > basicSettingsIndex, "特性情報パネルは基本設定の下に配置してください");
assert.ok(traitInfoIndex < techniqueIndex, "特性情報パネルは特技データの上に配置してください");
assert.doesNotMatch(html, /id="recipeTraitDescription"/, "基本設定の特性欄から説明表示を削除してください");
assert.match(html, /id="traitInfoName"/, "特性情報パネルに特性名の描画先を追加してください");
assert.match(html, /id="traitInfoDescription"/, "特性情報パネルに説明の描画先を追加してください");

assert.match(mainJs, /traitInfoPanel: document\.querySelector\("#traitInfoPanel"\)/);
assert.match(mainJs, /traitInfoName: document\.querySelector\("#traitInfoName"\)/);
assert.match(mainJs, /traitInfoDescription: document\.querySelector\("#traitInfoDescription"\)/);
assert.match(mainJs, /function renderTraitInfo\(\)/, "選択中の特性情報を描画してください");
assert.doesNotMatch(mainJs, /recipeTraitDescription/, "基本設定の説明表示への参照を削除してください");
