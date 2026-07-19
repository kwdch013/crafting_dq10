const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// BOARDノードの基準表示を検証します (Issue #155)。
// 基準範囲抽選の職人 (鍛冶3職人・調理: targetMode "random-in-range") は基準幅を、
// 固定基準値職人 (木工・裁縫など) は基準値のみを表示します。
const mainJs = fs.readFileSync("app/main.js", "utf8");
const boardTargetSummary = mainJs.slice(
	mainJs.indexOf("function formatBoardTargetSummary"),
	mainJs.indexOf("function getItemOptionLabel"),
);

const context = { results: {} };
vm.createContext(context);
vm.runInContext(`
	${boardTargetSummary}
	const item = { target: 151, successMin: 148, successMax: 154 };
	results.randomInRange = formatBoardTargetSummary(item, "random-in-range");
	results.fixedTarget = formatBoardTargetSummary(item, undefined);
`, context);

assert.equal(
	context.results.randomInRange,
	"基準幅 148 - 154",
	"基準範囲抽選の職人ではBOARDノードに基準幅を表示してください",
);
assert.equal(
	context.results.fixedTarget,
	"基準 151",
	"固定基準値職人ではBOARDノードに基準値のみを表示してください",
);

// 呼び出し元が targetMode を渡していることを確認します。
assert.match(
	mainJs,
	/formatBoardTargetSummary\(item, state\.targetMode\)/,
	"BOARD描画では state.targetMode を渡して基準表示を切り替えてください",
);

console.log("board-target-summary.test.js: ok");
