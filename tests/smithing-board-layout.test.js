const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainSource = fs.readFileSync("app/main.js", "utf8");
const styleSource = fs.readFileSync("app/styles.css", "utf8");

assert.match(
	mainSource,
	/classList\.toggle\(\s*"smithing-board"/,
	"鍛冶BOARDには、光スロット固定用の smithing-board クラスを付けてください",
);

assert.match(
	mainSource,
	/<div class="board-light-slot">[\s\S]*?formatCookingLightToggle\(item, special\)[\s\S]*?<\/div>/,
	"光切替の有無でセルの子要素数が変わらないよう、専用スロット内に描画してください",
);

assert.match(
	styleSource,
	/\.craft-board\.smithing-board \.board-cell:not\(\.empty\)\s*{[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\) 24px auto;/,
	"鍛冶セルは光スロット行を固定して、光地金の有効化でノード高さが変わらないようにしてください",
);

assert.match(
	styleSource,
	/\.craft-board\.smithing-board \.board-cell-badges\s*{[\s\S]*?min-height:\s*20px;/,
	"鍛冶セルは光バッジ表示でヘッダー高さが変わらないよう、バッジ領域を確保してください",
);
