const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");
const smithingDamageJs = fs.readFileSync("app/crafts/shared/smithing-damage.js", "utf8");
const smithingTechniques = JSON.parse(fs.readFileSync("app/crafts/shared/smithing-techniques.json", "utf8"));

const boardIndex = html.indexOf('id="layoutBoard"');
const referenceIndex = html.indexOf('id="smithingDamagePanel"');
const techniqueReferenceIndex = html.indexOf('id="smithingTechniquePanel"');
const splitPanelIndex = html.indexOf('class="split-panel"');

assert.ok(referenceIndex > boardIndex, "鍛冶ダメージ表は鍛冶配置の後に配置してください");
assert.ok(referenceIndex < splitPanelIndex, "鍛冶ダメージ表は判定パネルの前に配置してください");
assert.ok(techniqueReferenceIndex > referenceIndex, "鍛冶特技表は温度別ダメージの下に配置してください");
assert.ok(techniqueReferenceIndex < splitPanelIndex, "鍛冶特技表は判定パネルの前に配置してください");
assert.match(html, /id="smithingTemperatureDamageLabel"/, "現在温度の表示欄を追加してください");
assert.match(html, /id="smithingHeatDownButton"/, "BOARD内の温度低下ボタンを追加してください");
assert.match(html, /id="smithingHeatUpButton"/, "BOARD内の温度上昇ボタンを追加してください");
assert.match(html, /id="smithingDamageRanges"/, "温度別ダメージ表の描画先を追加してください");
assert.match(html, /id="smithingTechniqueRows"/, "鍛冶特技表の描画先を追加してください");

assert.match(mainJs, /smithingDamagePanel: document\.querySelector\("#smithingDamagePanel"\)/);
assert.match(mainJs, /smithingTechniquePanel: document\.querySelector\("#smithingTechniquePanel"\)/);
assert.match(mainJs, /function renderSmithingDamageReference\(\)/);
assert.match(mainJs, /function renderSmithingTechniqueReference\(\)/);
assert.match(mainJs, /function renderSmithingCellJudgements\(editor\)/, "鍛冶セル右クリック編集に倍率別判定を表示してください");
assert.match(mainJs, /function isSmithingLightHeatActive\(\)/, "光地金は温度が200の倍数の時だけ有効にしてください");
assert.match(mainJs, /editor-smithing-judgements/, "右クリック編集に鍛冶倍率判定欄を追加してください");
assert.match(mainJs, /isSmithingLightHeatActive\(\)[\s\S]*editor\.querySelector\("\.editor-glowing"\)\.checked/, "光地金の光状態は有効温度でのみ保存してください");
assert.match(mainJs, /hydrateSmithingTechniquesFromJson\(\)/);
assert.match(mainJs, /function adjustSmithingHeat\(delta\)/);
assert.match(mainJs, /smithingDamage\.ranges\?\.\[state\.heat\]/);
assert.match(mainJs, /会心最小 \$\{range\[0\] \* criticalMultiplier\}/);
assert.match(mainJs, /renderSmithingTechniqueReference\(\);[\s\S]*renderCraftReference\(\);/);
assert.match(mainJs, /renderSmithingDamageReference\(\);[\s\S]*renderLayoutBoard\(\);/);
assert.match(mainJs, /smithingHeatDownButton\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(-50\)\)/);
assert.match(mainJs, /smithingHeatUpButton\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(50\)\)/);
assert.match(smithingDamageJs, /power_1_2: \{ label: "1\.2倍"/, "1.2倍威力は倍率表記にしてください");
assert.doesNotMatch(smithingDamageJs, /label: "強め"/, "鍛冶ダメージ表に強め表記を残さないでください");
assert.match(
  fs.readFileSync("app/crafts/shared/smithing-component.js", "utf8"),
  /label: "光地金"/,
  "鍛冶職人の特性に光地金を追加してください",
);

assert.ok(Array.isArray(smithingTechniques.techniques), "鍛冶特技JSONはtechniques配列を持つこと");
assert.ok(smithingTechniques.techniques.length >= 4, "鍛冶特技JSONに主要特技を登録してください");
assert.deepEqual(
  smithingTechniques.techniques
    .filter((technique) => [
      "超4連打ち",
      "3倍打ち",
      "左右打ち",
      "冷やしこみ",
      "ななめ打ち",
      "上下ねらい打ち",
      "弱ねらい打ち",
      "みだれ打ち",
    ].includes(technique.name))
    .map((technique) => technique.name),
  [
    "超4連打ち",
    "3倍打ち",
    "左右打ち",
    "冷やしこみ",
    "ななめ打ち",
    "上下ねらい打ち",
    "弱ねらい打ち",
    "みだれ打ち",
  ],
  "追加指定された鍛冶特技を登録してください",
);
for (const technique of smithingTechniques.techniques) {
  assert.equal(typeof technique.name, "string", "特技名を登録してください");
  assert.equal(typeof technique.focusCost, "number", `${technique.name}の消費集中力を数値で登録してください`);
  assert.equal(typeof technique.multiplier, "number", `${technique.name}の倍率を数値で登録してください`);
  assert.equal(typeof technique.range, "string", `${technique.name}の範囲を登録してください`);
}

const heatInputHandler = mainJs.match(/elements\.heatInput\.addEventListener\("change", \(\) => \{([\s\S]*?)\n\}\);/);
assert.ok(heatInputHandler, "温度変更ハンドラが見つかりません");
assert.match(heatInputHandler[1], /renderSmithingDamageReference\(\);/);
