const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// 集中変化(会心率上昇)・倍半の際に、200℃ごとの会心確定ライン(残り数値)を新規パネルとして表示する機能を検証します。
const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");
const smithingComponentJs = fs.readFileSync("app/crafts/shared/smithing-component.js", "utf8");

assert.match(html, /id="smithingCriticalGaugePanel"[^>]*hidden/, "会心確定ラインパネルは初期非表示にしてください");
assert.match(html, /id="smithingCriticalGaugeRows"/, "会心確定ラインパネルの描画先を追加してください");
const damageIndex = html.indexOf('id="smithingDamagePanel"');
const gaugeIndex = html.indexOf('id="smithingCriticalGaugePanel"');
assert.ok(gaugeIndex > damageIndex, "会心確定ラインパネルは温度別ダメージ表の後に配置してください");

assert.match(mainJs, /smithingCriticalGaugePanel: document\.querySelector\("#smithingCriticalGaugePanel"\)/);
assert.match(mainJs, /smithingCriticalGaugeRows: document\.querySelector\("#smithingCriticalGaugeRows"\)/);
assert.match(mainJs, /component\.renderCriticalGaugeReference\?\.\(/, "会心確定ラインの描画は職人コンポーネントへ委譲してください");

assert.match(smithingComponentJs, /function renderCriticalGaugeReference\(/, "会心確定ラインの描画関数を鍛冶コンポーネントに追加してください");

const context = { window: {} };
context.window = context;
vm.createContext(context);
[
  "app/crafts/registry.js",
  "app/crafts/shared/smithing-damage.js",
  "app/crafts/shared/smithing-component.js",
  "app/crafts/weapon-smithing/config.js",
].forEach((file) => {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});
context.document = { createElement: () => ({ className: "", innerHTML: "" }) };

const component = context.DQ10CraftComponents["weapon-smithing"];
const config = { heatStates: context.DQ10SmithingDamage.heatStates };
const escapeHtml = (value) => String(value);

function renderPanel(traitId, heat = "1600") {
  const rows = [];
  const elements = {
    smithingCriticalGaugePanel: { hidden: true },
    smithingCriticalGaugeRows: {
      replaceChildren() {
        rows.length = 0;
      },
      append(row) {
        rows.push(row);
      },
    },
  };
  const state = { craftType: "weapon-smithing", traitId, heat };
  component.renderCriticalGaugeReference({ config, state, elements, escapeHtml });
  return { hidden: elements.smithingCriticalGaugePanel.hidden, rows };
}

{
  // 特性がなしの場合は非表示のままにします。
  const { hidden, rows } = renderPanel("none");
  assert.equal(hidden, true, "特性がなしの場合は会心確定ラインパネルを表示しないでください");
  assert.equal(rows.length, 0);
}

{
  // 倍半では200℃ごとに威力補正(半減・倍加)を反映した会心最小値を表示します。
  const { hidden, rows } = renderPanel("double-half");
  assert.equal(hidden, false, "倍半では会心確定ラインパネルを表示してください");
  assert.equal(rows.length, 10, "200℃〜2000℃の10段階を表示してください");

  const row200 = rows.find((row) => row.innerHTML.includes("200℃"));
  assert.match(row200.innerHTML, /200℃ 半減/);
  assert.match(row200.innerHTML, /通常: 残り8以下で会心確定/, "200℃(半減)の通常威力は会心最小8にしてください");

  const row400 = rows.find((row) => row.innerHTML.includes("400℃"));
  assert.match(row400.innerHTML, /400℃ 倍加/);
  assert.match(row400.innerHTML, /通常: 残り36以下で会心確定/, "400℃(倍加)の通常威力は会心最小36にしてください");
}

{
  // 集中変化はダメージ自体を変えないため、通常時と同じ会心最小値になります。
  const { hidden, rows } = renderPanel("focus-change");
  assert.equal(hidden, false, "集中変化では会心確定ラインパネルを表示してください");

  const row200 = rows.find((row) => row.innerHTML.includes("200℃"));
  assert.match(row200.innerHTML, /200℃ 集中増加/);
  assert.match(row200.innerHTML, /通常: 残り16以下で会心確定/, "200℃の通常威力の会心最小はダメージ表と同じ16にしてください");
}

console.log("smithing-critical-gauge-panel.test.js OK");
