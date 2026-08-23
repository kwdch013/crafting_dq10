const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");
const smithingDamageJs = fs.readFileSync("app/crafts/shared/smithing-damage.js", "utf8");
const smithingComponentJs = fs.readFileSync("app/crafts/shared/smithing-component.js", "utf8");
const boardCellEditorJs = fs.readFileSync("app/board-cell-editor.js", "utf8");

const boardIndex = html.indexOf('id="layoutBoard"');
const referenceIndex = html.indexOf('id="smithingDamagePanel"');
const recommendationIndex = html.indexOf('id="recommendationList"');
const boardTemperatureCommand = html.match(/<div class="command-group smithing-only-command">\s*<span>温度<\/span>[\s\S]*?<\/div>/)?.[0] || "";
const smithingDamageHeading = html.slice(referenceIndex, html.indexOf('id="smithingDamageRanges"'));

assert.ok(referenceIndex > boardIndex, "鍛冶ダメージ表は鍛冶配置の後に配置してください");
assert.ok(referenceIndex < recommendationIndex, "鍛冶ダメージ表は候補手パネルの前に配置してください");
assert.match(boardTemperatureCommand, /id="smithingHeatDownButton"/, "-50℃ボタンはBOARD上部の温度欄へ移動してください");
assert.match(boardTemperatureCommand, /id="smithingTemperatureSelect"/, "温度選択はBOARD上部の温度欄へ移動してください");
assert.match(boardTemperatureCommand, /id="smithingHeatUpButton"/, "+50℃ボタンはBOARD上部の温度欄へ移動してください");
assert.doesNotMatch(smithingDamageHeading, /id="smithingHeat(?:Down|Up)Button"|id="smithingTemperatureSelect"/, "SMITHING DAMAGE見出しには温度操作を残さないでください");
assert.doesNotMatch(html, /id="smithingTemperatureDamageLabel"/, "温度プルダウン横の現在温度表示は不要です");
assert.match(html, /id="smithingTemperatureSelect"/, "BOARD内の温度プルダウンを追加してください");
assert.match(html, /id="smithingHeatDownButton"/, "BOARD内の温度低下ボタンを追加してください");
assert.match(html, /id="smithingHeatUpButton"/, "BOARD内の温度上昇ボタンを追加してください");
assert.match(html, /id="smithingHeatDown200Button"[^>]*>-200℃<\/button>/, "BOARD上部に-200℃ボタンを追加してください");
assert.match(html, /id="smithingHeatUp200Button"[^>]*>\+200℃<\/button>/, "BOARD上部に+200℃ボタンを追加してください");
assert.match(html, /id="smithingDamageRanges"/, "温度別ダメージ表の描画先を追加してください");
assert.match(html, /id="smithingBoardTraitState"/, "BOARD上部に鍛冶の現在特性状態を表示してください");
assert.doesNotMatch(html, /id="smithingBoardTraitState" hidden/, "鍛冶特性状態欄は温度変更でBOARD位置が動かないよう初期表示領域を確保してください");
assert.match(html, /id="techniqueDataPanel"/, "特技データパネルは職人別に表示制御できるようにしてください");
assert.match(html, /id="techniqueDataPanel"[\s\S]*<h2>特技データ<\/h2>/, "特技データパネル本体に表示制御IDを付けてください");
assert.doesNotMatch(html, /id="smithingTechniquePanel"/, "鍛冶職人の追加特技データ表は表示しないでください");
assert.doesNotMatch(html, /id="smithingTechniqueRows"/, "鍛冶職人の追加特技データ表は表示しないでください");
assert.match(html, /status-gauge-entry[^"]*">ゲージ突入/, "鍛冶のゲージ突入判定を凡例に表示してください");

assert.match(mainJs, /smithingDamagePanel: document\.querySelector\("#smithingDamagePanel"\)/);
assert.match(mainJs, /smithingBoardTraitState: document\.querySelector\("#smithingBoardTraitState"\)/);
assert.doesNotMatch(mainJs, /smithingTechniquePanel/, "鍛冶職人の追加特技データ表は参照しないでください");
assert.match(mainJs, /function renderSmithingDamageReference\(\)[\s\S]*renderBoardReference/, "鍛冶ダメージ表の描画は職人コンポーネントへ委譲してください");
assert.match(mainJs, /cookingCommandPanel\.hidden = !showsCommandPanel/, "鍛冶職人でも必殺状態をBOARD上部で操作できるようにしてください");
assert.match(mainJs, /specialChargeToggle\.textContent = getSpecialActionLabel/, "職人別の必殺名を表示してください");
assert.match(mainJs, /state\.specialChargeState === "using"/, "鍛冶の使用中状態を判定に使ってください");
assert.match(mainJs, /techniqueDataPanel\.hidden = hidesTechniqueData/, "鍛冶職人では特技データパネルを非表示にしてください");
assert.match(mainJs, /craftFamily === "smithing"/, "鍛冶職人の特技データ非表示条件を追加してください");
assert.doesNotMatch(mainJs, /function renderSmithingTechniqueReference\(\)/, "鍛冶職人の追加特技データ表は描画しないでください");
assert.match(mainJs, /function renderSmithingCellJudgements\(editor\)/, "鍛冶セル右クリック編集に倍率別判定を表示してください");
assert.match(smithingComponentJs, /function getSmithingDamagePowerEntries\(\)/, "鍛冶ダメージ表は倍率順を鍛冶コンポーネントで整列してください");
assert.match(mainJs, /function syncJudgementLegend\(\)/, "固定凡例は職人別に表示制御してください");
assert.match(mainJs, /function applyHeatStateChange\(nextStateId\)[\s\S]*applyHeatChange/, "温度・ぬいパワー変更時に職人コンポーネントへ委譲してください");
assert.match(mainJs, /smithingTemperatureSelect: document\.querySelector\("#smithingTemperatureSelect"\)/);
assert.match(mainJs, /smithingHeatDown200Button: document\.querySelector\("#smithingHeatDown200Button"\)/, "-200℃ボタンを操作対象として取得してください");
assert.match(mainJs, /smithingHeatUp200Button: document\.querySelector\("#smithingHeatUp200Button"\)/, "+200℃ボタンを操作対象として取得してください");
assert.match(smithingComponentJs, /function renderTemperatureSelect\(/, "BOARD内の温度プルダウンは鍛冶コンポーネントで描画してください");
assert.match(mainJs, /getDefaultHeatId\(config\)/, "初期温度は職人設定の既定値を優先してください");
assert.doesNotMatch(mainJs, /applySmithingReturn/, "戻り地金の戻り値は手動入力にしてください");
assert.match(mainJs, /function isSmithingLightHeatActive\(\)[\s\S]*isLightHeatActive/, "光地金の有効判定は職人コンポーネントへ委譲してください");
assert.match(smithingComponentJs, /function isLightHeatActive\(state\)/, "光地金は鍛冶コンポーネントで温度が200の倍数の時だけ有効にしてください");
assert.match(mainJs, /editor-smithing-judgements/, "右クリック編集に鍛冶倍率判定欄を追加してください");
assert.match(mainJs, /lockedField\.hidden = !hasIngredient/, "鍛冶職人の右クリック編集では確定済み欄を表示してください");
assert.match(mainJs, /lockLabel\.textContent = isCurrentCraftFamily\("smithing"\) \? "確定済み" : "固定する"/, "鍛冶職人の右クリック編集では固定欄を確定済みとして表示してください");
assert.match(mainJs, /isCurrentCraftFamily\("smithing"\)[\s\S]*\? "確定済み"[\s\S]*: item\.lockJudgementLabel \|\| "固定"/, "鍛冶BOARDの固定バッジは確定済みとして表示してください");
assert.match(mainJs, /row\.classList\.add\(`status-\$\{analysis\.status\}`\)/, "鍛冶倍率判定行は判定ステータスと同じ色にしてください");
assert.match(mainJs, /isSmithingLightHeatActive\(\)[\s\S]*editor\.querySelector\("\.editor-glowing"\)\.checked/, "光地金の光状態は有効温度でのみ保存してください");
assert.match(mainJs, /const judgementRange = DQ10BoardCellEditor\.formatJudgementRange\(entry, analysis\)/, "右クリック編集の判定表示は共通ヘルパーへ委譲してください");
assert.match(boardCellEditorJs, /\$\{analysis\.normalMin\}-\$\{analysis\.normalMax\} \/ 会心/, "右クリック編集の鍛冶非会心ダメージは光地金などの倍率補正後を表示してください");
assert.doesNotMatch(mainJs, /hydrateSmithingTechniquesFromJson/, "鍛冶特技の追加JSONは読み込まないでください");
assert.match(mainJs, /function adjustSmithingHeat\(delta\)[\s\S]*getNextHeat/, "鍛冶温度の次値計算は職人コンポーネントへ委譲してください");
assert.match(smithingComponentJs, /smithingDamage\.ranges\?\.\[state\.heat\]/);
assert.match(smithingComponentJs, /getAdjustedDamageRange\(range, state\)/, "温度別ダメージ表は鍛冶特性の威力補正後を表示してください");
assert.match(smithingComponentJs, /会心最小 \$\{adjustedRange\[0\] \* criticalMultiplier\}/);
assert.match(smithingComponentJs, /function renderHeatTraitState\(/, "鍛冶の現在特性状態をBOARD上部へ描画してください");
assert.doesNotMatch(smithingComponentJs, /smithingBoardTraitState\.hidden = !shouldShow/, "鍛冶特性状態欄は発動有無で非表示にしないでください");
assert.match(smithingComponentJs, /特性発動なし/, "鍛冶特性が未発動でも通常状態を表示してください");
assert.match(smithingComponentJs, /半減[\s\S]*威力0\.5倍/, "倍半の半減状態を表示してください");
assert.match(mainJs, /renderSmithingDamageReference\(\);[\s\S]*renderLayoutBoard\(\);/);
assert.match(mainJs, /syncJudgementLegend\(\);[\s\S]*renderAnalysis\(\);/);
assert.match(mainJs, /smithingHeatDownButton\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(-50\)\)/);
assert.match(mainJs, /smithingHeatUpButton\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(50\)\)/);
assert.match(mainJs, /smithingHeatDown200Button\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(-200\)\)/, "-200℃ボタンは200℃低下として同期してください");
assert.match(mainJs, /smithingHeatUp200Button\?\.addEventListener\("click", \(\) => adjustSmithingHeat\(200\)\)/, "+200℃ボタンは200℃上昇として同期してください");
assert.match(mainJs, /smithingTemperatureSelect\?\.addEventListener\("change", \(\) => changeSmithingHeatFromBoard\(\)\)/);
assert.match(smithingComponentJs, /smithingHeatDown200Button\.disabled = currentHeat - 200 < minHeat/, "最小温度では-200℃ボタンを無効化してください");
assert.match(smithingComponentJs, /smithingHeatUp200Button\.disabled = currentHeat \+ 200 > maxHeat/, "最大温度では+200℃ボタンを無効化してください");
assert.match(smithingDamageJs, /power_1_2: \{ label: "1\.2倍"/, "1.2倍威力は倍率表記にしてください");
assert.doesNotMatch(smithingDamageJs, /power_0_8/, "鍛冶ダメージ表から0.8倍威力を削除してください");
const powersDefinition = smithingDamageJs.slice(smithingDamageJs.indexOf("const powers = {"));
assert.ok(
  powersDefinition.indexOf("power_0_5") < powersDefinition.indexOf("normal:") &&
    powersDefinition.indexOf("normal:") < powersDefinition.indexOf("power_1_2") &&
    powersDefinition.indexOf("power_1_2") < powersDefinition.indexOf("power_2_0") &&
    powersDefinition.indexOf("power_2_0") < powersDefinition.indexOf("power_2_5") &&
    powersDefinition.indexOf("power_2_5") < powersDefinition.indexOf("power_3_0"),
  "鍛冶ダメージ倍率は低い順に定義してください",
);
assert.doesNotMatch(smithingDamageJs, /label: "強め"/, "鍛冶ダメージ表に強め表記を残さないでください");
assert.match(
  smithingComponentJs,
  /label: "光地金"/,
  "鍛冶職人の特性に光地金を追加してください",
);
assert.match(
  smithingComponentJs,
  /label: "倍半"[\s\S]*label: "戻り"[\s\S]*label: "集中変化"/,
  "鍛冶職人の地金特性を追加してください",
);
assert.match(
  smithingComponentJs,
  /formatLightToggle[\s\S]*board-light-toggle/,
  "鍛冶職人でもBOARDノード上から光状態を切り替えられるようにしてください",
);
assert.match(
  smithingComponentJs,
  /isSmithingReturnNextTurn/,
  "戻り地金は200n+50℃で次が戻りターンと分かるようにしてください",
);

assert.equal(fs.existsSync("app/crafts/shared/smithing-techniques.json"), false, "鍛冶特技の追加JSONは不要です");

// 占有マスの読み順(行→列)でA/B/C...を返す、config読み込み用の簡易実装です。
function readingOrderPositionName(cells, row, column) {
  const order = (cells || [])
    .map((cell) => ({ row: Number(cell.row), column: Number(cell.column) }))
    .sort((a, b) => a.row - b.row || a.column - b.column);
  const index = order.findIndex((cell) => cell.row === Number(row) && cell.column === Number(column));
  let remaining = (index < 0 ? 0 : index) + 1;
  let label = "";
  while (remaining > 0) {
    remaining -= 1;
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26);
  }
  return label || "A";
}

function loadSmithingConfig(path) {
  let capturedConfig = null;
  const source = fs.readFileSync(path, "utf8");
  Function(
    "registerDQ10Craft",
    "createDQ10SmithingCraftConfig",
    "createDQ10ReadingOrderPositionName",
    `${source}\nreturn null;`,
  )(
    (config) => {
      capturedConfig = config;
    },
    (config) => config,
    readingOrderPositionName,
  );
  return capturedConfig;
}

for (const path of [
  "app/crafts/weapon-smithing/config.js",
  "app/crafts/armor-smithing/config.js",
  "app/crafts/tool-smithing/config.js",
]) {
  const config = loadSmithingConfig(path);
  const multipliers = config.techniques.map((technique) => technique.multiplier ?? 0);
  assert.deepEqual(
    multipliers,
    [...multipliers].sort((a, b) => a - b),
    `${path}の鍛冶特技は倍率の低い順に並べてください`,
  );
}

const heatInputHandler = mainJs.match(/elements\.heatInput\.addEventListener\("change", \(\) => \{([\s\S]*?)\n\}\);/);
assert.ok(heatInputHandler, "温度変更ハンドラが見つかりません");
assert.match(heatInputHandler[1], /refreshAfterHeatChange\(\);/);

const css = fs.readFileSync("app/styles.css", "utf8");
assert.match(css, /\.status-gauge-entry/, "ゲージ突入のステータス色を定義してください");
assert.match(css, /\.board-cell-editor \[hidden\][\s\S]*display: none;/, "右クリック編集内の非表示フィールドは確実に隠してください");
