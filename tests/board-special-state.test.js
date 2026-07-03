const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.match(
	html,
	/<p class="eyebrow">Board<\/p>/,
	"BOARD文字は通常の見出しであること",
);
assert.match(
	html,
	/<button class="command-title special-charge-toggle" id="specialChargeToggle" type="button">ミラクルグリル<\/button>/,
	"ミラクルグリル文字が左クリック可能なボタンであること",
);
assert.match(
	html,
	/<span class="board-special-state" id="boardSpecialStateLabel">未チャージ<\/span>/,
	"ミラクルグリルの横に必殺状態表示があること",
);
assert.match(mainJs, /const specialChargeStates = \["uncharged", "charging", "active"\];/);
assert.match(mainJs, /function normalizeSpecialChargeState\(value\)/);
assert.match(mainJs, /function toggleBoardSpecialState\(\)/);
assert.match(mainJs, /elements\.specialChargeToggle\.addEventListener\("click", toggleBoardSpecialState\);/);
