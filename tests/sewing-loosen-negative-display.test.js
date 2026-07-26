const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const mainJs = fs.readFileSync("app/main.js", "utf8");
const css = fs.readFileSync("app/styles.css", "utf8");

// 特技データパネル: ほぐしぬいの通常・会心レンジと分布を赤字クラスで表示する
assert.match(
  mainJs,
  /const isLoosenDamage = technique\.actionId === "loosen"/,
  "特技データ描画でほぐしぬいを判定してください",
);
assert.match(
  mainJs,
  /\.tech-normal-range"\)\.classList\.toggle\("negative-damage", isLoosenDamage\)/,
  "ほぐしぬいの通常レンジへ赤字クラスを付けてください",
);
assert.match(
  mainJs,
  /\.tech-critical-range"\)\.classList\.toggle\("negative-damage", isLoosenDamage\)/,
  "ほぐしぬいの会心レンジへ赤字クラスを付けてください",
);
assert.match(
  mainJs,
  /distribution\.classList\.toggle\("negative-damage", isLoosenDamage\)/,
  "ほぐしぬいの分布表示へ赤字クラスを付けてください",
);

// BOARDセル右クリック編集: ほぐし行のマイナス値を赤字で表示する
assert.match(
  mainJs,
  /const isLoosenJudgement = entry\.id === "loosen"/,
  "セル判定行でほぐしを判定してください",
);
assert.match(
  mainJs,
  /class="numeric\$\{isLoosenJudgement \? " negative-damage" : ""\}"/,
  "ほぐし判定行のダメージ値へ赤字クラスを付けてください",
);

// 赤字スタイルの定義
assert.match(
  css,
  /\.negative-damage \{[^}]*color: #dc2626;[^}]*\}/,
  "マイナスダメージ用の赤字スタイルを定義してください",
);

// セル判定行の color: inherit (詳細度 0,1,1) は .negative-damage 単独 (0,1,0) より強いため、
// 判定行スコープの上書きルールが inherit 定義より後に必要
const inheritRuleIndex = css.indexOf(".editor-smithing-judgement-row span,");
const overrideRuleMatch = css.match(
  /\.editor-damage-judgement-row \.negative-damage,\s*\.editor-smithing-judgement-row \.negative-damage \{[^}]*color: #dc2626;[^}]*\}/,
);
assert.ok(inheritRuleIndex >= 0, "セル判定行の文字色定義が見つかりません");
assert.ok(overrideRuleMatch, "セル判定行内のマイナスダメージ赤字を上書きするルールを定義してください");
assert.ok(
  css.indexOf(overrideRuleMatch[0]) > inheritRuleIndex,
  "赤字の上書きルールはセル判定行の color: inherit より後に定義してください",
);

// 特技データパネル: ほぐしぬいは会心判定が存在しないため会心欄を「-」表示にする
assert.match(
  mainJs,
  /card\.querySelector\("\.tech-critical-range"\)\.textContent = isLoosenDamage\s*\n\s*\? "-"/,
  "ほぐしぬいの会心欄は「-」表示にしてください",
);

// BOARDセル右クリック判定: ほぐし行は会心判定が存在しないため候補から除外し、通常レンジのみ表示する
{
  const context = { window: {} };
  context.window = context;
  vm.createContext(context);
  [
    "app/crafts/registry.js",
    "app/crafts/shared/sewing-damage.js",
    "app/crafts/sewing/component.js",
    "app/board-cell-editor.js",
  ].forEach((file) => {
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  });

  const component = context.DQ10CraftComponents.sewing;
  const boardCellEditor = context.DQ10BoardCellEditor;

  const entries = component.getCellJudgementEntries({ heat: "normal" });
  const loosenEntry = entries.find((entry) => entry.id === "loosen");

  assert.equal(loosenEntry.kind, "no-critical", "ほぐし行は会心なしの種別を付与してください");
  assert.equal(
    loosenEntry.technique.criticalMultiplier,
    1,
    "ほぐし行の会心倍率は実質会心なしとして1にしてください",
  );

  const otherEntry = entries.find((entry) => entry.id === "sew");
  assert.equal(Object.hasOwn(otherEntry, "kind"), false, "他の特技行にはkindを付与しないでください");

  assert.equal(
    boardCellEditor.formatJudgementRange(
      loosenEntry,
      { normalMin: -4, normalMax: -3, criticalMin: -8, criticalMax: -6 },
    ),
    "-4--3",
    "ほぐし行の判定表示は会心欄を含めないでください",
  );
}
