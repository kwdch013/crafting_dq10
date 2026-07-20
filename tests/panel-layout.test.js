const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const css = fs.readFileSync("app/styles.css", "utf8");

// カラム境界: control-panel が左、main-panel が右
const controlPanelIndex = html.indexOf('class="control-panel"');
const mainPanelIndex = html.indexOf('class="main-panel"');
assert.ok(controlPanelIndex >= 0, "左カラム (control-panel) を配置してください");
assert.ok(mainPanelIndex > controlPanelIndex, "右カラム (main-panel) は左カラムの後に配置してください");

// 左カラムの並び: 基本設定 → 特性情報 → 判定基準 → キャプチャ接続
const basicSettingsIndex = html.indexOf("<h2>基本設定</h2>");
const traitInfoIndex = html.indexOf('id="traitInfoPanel"');
const judgementIndex = html.indexOf("<h2>判定基準</h2>");
const captureIndex = html.indexOf("<h2>キャプチャ接続</h2>");
assert.ok(basicSettingsIndex > controlPanelIndex && basicSettingsIndex < mainPanelIndex, "基本設定は左カラムに配置してください");
assert.ok(traitInfoIndex > basicSettingsIndex && traitInfoIndex < mainPanelIndex, "特性情報は左カラムの基本設定の下に配置してください");
assert.ok(judgementIndex > traitInfoIndex && judgementIndex < mainPanelIndex, "判定基準は左カラムの特性情報の下に配置してください");
assert.ok(captureIndex > judgementIndex && captureIndex < mainPanelIndex, "キャプチャ接続は左カラムの判定基準の下に配置してください");

// 右カラム: BOARD はサマリー直下のまま、特技データとダメージ表を配置
const summaryIndex = html.indexOf('class="summary-grid"');
const boardIndex = html.indexOf('id="layoutBoard"');
const techniquePanelIndex = html.indexOf('id="techniqueDataPanel"');
const smithingDamageIndex = html.indexOf('id="smithingDamagePanel"');
const recommendationIndex = html.indexOf('id="recommendationList"');
assert.ok(summaryIndex > mainPanelIndex, "サマリーは右カラムの先頭に配置してください");
assert.ok(boardIndex > summaryIndex, "BOARD はサマリー直下に配置してください");
assert.ok(techniquePanelIndex > boardIndex, "特技データは右カラムの BOARD の後に配置してください");
assert.ok(smithingDamageIndex > boardIndex, "温度別ダメージは右カラムの BOARD の後に配置してください");
assert.ok(recommendationIndex > techniquePanelIndex, "候補手は特技データの後に配置してください");

// 判定基準を左カラムへ移したため、split-panel の 2 カラム分割は廃止する
assert.doesNotMatch(html, /class="split-panel"/, "split-panel は廃止してください");
assert.doesNotMatch(css, /\.split-panel/, "split-panel のスタイルは削除してください");

// 情報量の多い特技データとダメージ表は、広い右カラムで従来より大きく表示する
const techniqueValueRule = css.match(/\.technique-value strong \{[^}]*\}/);
assert.ok(techniqueValueRule, "特技データの数値スタイルを定義してください");
const techniqueFontSize = Number(techniqueValueRule[0].match(/font-size: (\d+)px/)?.[1]);
assert.ok(techniqueFontSize >= 16, "特技データの数値は 16px 以上で大きく表示してください");
const smithingDamageRule = css.match(/\.smithing-damage-row strong,\s*\.smithing-damage-row span \{[^}]*\}/);
assert.ok(smithingDamageRule, "温度別ダメージのスタイルを定義してください");
const smithingFontSize = Number(smithingDamageRule[0].match(/font-size: (\d+)px/)?.[1]);
assert.ok(smithingFontSize >= 15, "温度別ダメージの数値は 15px 以上で大きく表示してください");
