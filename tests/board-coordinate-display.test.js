const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");

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
