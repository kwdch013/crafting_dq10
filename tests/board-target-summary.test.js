const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");
const boardTargetSummary = mainJs.slice(
	mainJs.indexOf("function formatBoardTargetSummary"),
	mainJs.indexOf("function getItemOptionLabel"),
);

assert.match(
	boardTargetSummary,
	/return `基準 \$\{item\.target\}`;/,
	"BOARDでは各ノードの基準値だけを表示してください",
);
assert.doesNotMatch(
	boardTargetSummary,
	/successMin|successMax|targetMode/,
	"BOARDの基準表示には基準範囲を含めないでください",
);
