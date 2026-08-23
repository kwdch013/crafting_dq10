const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");
const cookingComponentJs = fs.readFileSync("app/crafts/cooking/component.js", "utf8");

assert.doesNotMatch(
	mainJs,
	/\$\{formatBoardBadge\(getItemOptionLabel\(config, item\.optionId\)\)\}/,
	"BOARD右上に現在位置の種別バッジを表示しないでください",
);
assert.doesNotMatch(
	mainJs,
	/initialGridCell: normalizeGridCell\(/,
	"各ノードの初期座標を内部状態に保持しないでください",
);
assert.doesNotMatch(
	mainJs,
	/cell\.dataset\.initialRow = String\(item\.initialGridCell\?\.row \|\| ""\);/,
	"BOARDセルに初期行のdata属性を出力しないでください",
);
assert.doesNotMatch(
	mainJs,
	/cell\.dataset\.currentColumn = String\(item\.gridCell\?\.column \|\| ""\);/,
	"BOARDセルに現在列のdata属性を出力しないでください",
);
assert.doesNotMatch(
	mainJs,
	/<div class="board-cell-head">\s*<strong>\$\{escapeHtml\(item\.name\)\}<\/strong>/,
	"BOARDセルのテンプレートで食材名を直接表示しないでください",
);
assert.match(
	mainJs,
	/\$\{boardCellTitle\}/,
	"BOARDセル左上の表示は職人別タイトル整形を使ってください",
);
assert.match(
	cookingComponentJs,
	/function formatBoardCellTitle\(\) \{\s*return "";\s*\}/,
	"調理BOARDの食材ノード左上に初期位置名を表示しないでください",
);
