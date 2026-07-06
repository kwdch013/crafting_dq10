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
assert.match(html, /status-gauge-entry">ゲージ突入/, "鍛冶のゲージ突入判定を凡例に表示してください");

assert.match(mainJs, /smithingDamagePanel: document\.querySelector\("#smithingDamagePanel"\)/);
assert.match(mainJs, /smithingTechniquePanel: document\.querySelector\("#smithingTechniquePanel"\)/);
assert.match(mainJs, /function renderSmithingDamageReference\(\)/);
assert.match(mainJs, /function renderSmithingTechniqueReference\(\)/);
assert.match(mainJs, /function renderSmithingCellJudgements\(editor\)/, "鍛冶セル右クリック編集に倍率別判定を表示してください");
assert.match(mainJs, /function getSmithingDamagePowerEntries\(\)/, "鍛冶ダメージ表は倍率順を共通関数で整列してください");
assert.match(mainJs, /function syncJudgementLegend\(\)/, "固定凡例は職人別に表示制御してください");
assert.match(mainJs, /function applySmithingHeatChange\(nextHeat\)/, "鍛冶温度変更時に表示状態を更新してください");
assert.doesNotMatch(mainJs, /applySmithingReturn/, "戻り地金の戻り値は手動入力にしてください");
assert.match(mainJs, /function isSmithingLightHeatActive\(\)/, "光地金は温度が200の倍数の時だけ有効にしてください");
assert.match(mainJs, /editor-smithing-judgements/, "右クリック編集に鍛冶倍率判定欄を追加してください");
assert.match(mainJs, /lockedField\.hidden = !hasIngredient \|\| isCurrentCraftFamily\("smithing"\)/, "鍛冶職人の右クリック編集では固定欄を非表示にしてください");
assert.match(mainJs, /row\.classList\.add\(`status-\$\{analysis\.status\}`\)/, "鍛冶倍率判定行は判定ステータスと同じ色にしてください");
assert.match(mainJs, /isSmithingLightHeatActive\(\)[\s\S]*editor\.querySelector\("\.editor-glowing"\)\.checked/, "光地金の光状態は有効温度でのみ保存してください");
assert.match(mainJs, /hydrateSmithingTechniquesFromJson\(\)/);
assert.match(mainJs, /function adjustSmithingHeat\(delta\)/);
assert.match(mainJs, /smithingDamage\.ranges\?\.\[state\.heat\]/);
assert.match(mainJs, /会心最小 \$\{range\[0\] \* criticalMultiplier\}/);
assert.match(mainJs, /renderSmithingTechniqueReference\(\);[\s\S]*renderCraftReference\(\);/);
assert.match(mainJs, /renderSmithingDamageReference\(\);[\s\S]*renderLayoutBoard\(\);/);
assert.match(mainJs, /syncJudgementLegend\(\);[\s\S]*renderAnalysis\(\);/);
assert.match(mainJs, /smithingHeatDownButton\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(-50\)\)/);
assert.match(mainJs, /smithingHeatUpButton\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(50\)\)/);
assert.match(smithingDamageJs, /power_1_2: \{ label: "1\.2倍"/, "1.2倍威力は倍率表記にしてください");
const powersDefinition = smithingDamageJs.slice(smithingDamageJs.indexOf("const powers = {"));
assert.ok(
  powersDefinition.indexOf("power_0_5") < powersDefinition.indexOf("power_0_8") &&
    powersDefinition.indexOf("power_0_8") < powersDefinition.indexOf("normal:") &&
    powersDefinition.indexOf("normal:") < powersDefinition.indexOf("power_1_2") &&
    powersDefinition.indexOf("power_1_2") < powersDefinition.indexOf("power_2_0") &&
    powersDefinition.indexOf("power_2_0") < powersDefinition.indexOf("power_2_5") &&
    powersDefinition.indexOf("power_2_5") < powersDefinition.indexOf("power_3_0"),
  "鍛冶ダメージ倍率は低い順に定義してください",
);
assert.doesNotMatch(smithingDamageJs, /label: "強め"/, "鍛冶ダメージ表に強め表記を残さないでください");
assert.match(
  fs.readFileSync("app/crafts/shared/smithing-component.js", "utf8"),
  /label: "光地金"/,
  "鍛冶職人の特性に光地金を追加してください",
);
assert.match(
  fs.readFileSync("app/crafts/shared/smithing-component.js", "utf8"),
  /label: "倍半"[\s\S]*label: "戻り"[\s\S]*label: "集中変化"/,
  "鍛冶職人の地金特性を追加してください",
);
assert.match(
  fs.readFileSync("app/crafts/shared/smithing-component.js", "utf8"),
  /formatLightToggle[\s\S]*board-light-toggle/,
  "鍛冶職人でもBOARDノード上から光状態を切り替えられるようにしてください",
);
assert.match(
  fs.readFileSync("app/crafts/shared/smithing-component.js", "utf8"),
  /isSmithingReturnNextTurn/,
  "戻り地金は200n+50℃で次が戻りターンと分かるようにしてください",
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

const css = fs.readFileSync("app/styles.css", "utf8");
assert.match(css, /\.status-gauge-entry/, "ゲージ突入のステータス色を定義してください");
