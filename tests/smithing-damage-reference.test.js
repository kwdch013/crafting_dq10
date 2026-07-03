const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

const boardIndex = html.indexOf('id="layoutBoard"');
const referenceIndex = html.indexOf('id="smithingDamagePanel"');
const itemSectionIndex = html.indexOf('id="itemSectionTitle"');

assert.ok(referenceIndex > boardIndex, "鍛冶ダメージ表は鍛冶配置の後に配置してください");
assert.ok(referenceIndex < itemSectionIndex, "鍛冶ダメージ表は鍛冶マス入力の前に配置してください");
assert.match(html, /id="smithingTemperatureDamageLabel"/, "現在温度の表示欄を追加してください");
assert.match(html, /id="smithingHeatDownButton"/, "BOARD内の温度低下ボタンを追加してください");
assert.match(html, /id="smithingHeatUpButton"/, "BOARD内の温度上昇ボタンを追加してください");
assert.match(html, /id="smithingDamageRanges"/, "温度別ダメージ表の描画先を追加してください");

assert.match(mainJs, /smithingDamagePanel: document\.querySelector\("#smithingDamagePanel"\)/);
assert.match(mainJs, /function renderSmithingDamageReference\(\)/);
assert.match(mainJs, /function adjustSmithingHeat\(delta\)/);
assert.match(mainJs, /DQ10SmithingDamage\?\.ranges\?\.\[state\.heat\]/);
assert.match(mainJs, /renderSmithingDamageReference\(\);[\s\S]*renderIngredients\(\);/);
assert.match(mainJs, /smithingHeatDownButton\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(-50\)\)/);
assert.match(mainJs, /smithingHeatUpButton\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(50\)\)/);

const heatInputHandler = mainJs.match(/elements\.heatInput\.addEventListener\("change", \(\) => \{([\s\S]*?)\n\}\);/);
assert.ok(heatInputHandler, "温度変更ハンドラが見つかりません");
assert.match(heatInputHandler[1], /renderSmithingDamageReference\(\);/);
