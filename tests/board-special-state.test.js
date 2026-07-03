const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.match(
	html,
	/<button class="eyebrow board-special-toggle" id="boardSpecialToggle" type="button">Board<\/button>/,
	"BOARD文字が左クリック可能なボタンであること",
);
assert.match(
	html,
	/<span class="board-special-state" id="boardSpecialStateLabel">未チャージ<\/span>/,
	"BOARD見出しに必殺状態表示があること",
);
assert.match(mainJs, /const specialChargeStates = \["uncharged", "charging", "active"\];/);
assert.match(mainJs, /function normalizeSpecialChargeState\(value\)/);
assert.match(mainJs, /function toggleBoardSpecialState\(\)/);
assert.match(mainJs, /elements\.boardSpecialToggle\.addEventListener\("click", toggleBoardSpecialState\);/);
