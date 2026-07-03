const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.doesNotMatch(
	mainJs,
	/\$\{formatBoardBadge\(getItemOptionLabel\(config, item\.optionId\)\)\}/,
	"BOARD右上に現在位置の種別バッジを表示しないでください",
);
assert.match(
	mainJs,
	/initialGridCell: normalizeGridCell\(/,
	"各ノードの初期座標は内部状態に保持してください",
);
assert.match(
	mainJs,
	/cell\.dataset\.initialRow = String\(item\.initialGridCell\?\.row \|\| ""\);/,
	"画面取得用に初期行をdata属性へ保持してください",
);
assert.match(
	mainJs,
	/cell\.dataset\.currentColumn = String\(item\.gridCell\?\.column \|\| ""\);/,
	"画面取得用に現在列をdata属性へ保持してください",
);
