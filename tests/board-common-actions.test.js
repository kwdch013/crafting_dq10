const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const boardActionsMatch = html.match(/<div class="board-actions" id="boardActions">([\s\S]*?)<\/div>/);

assert.ok(boardActionsMatch, "BOARD操作領域が存在すること");

const boardActions = boardActionsMatch[1];
const buttonLabels = [...boardActions.matchAll(/<button\b[^>]*>([^<]*)<\/button>/g)]
	.map((match) => match[1].trim());

assert.deepEqual(buttonLabels, ["左90°", "右90°", "戻る", "進む"]);
assert.match(boardActions, /id="rotateWoodLeftButton"[^>]*hidden/, "木工の左90度回転ボタンは初期非表示にしてください");
assert.match(boardActions, /id="rotateWoodRightButton"[^>]*hidden/, "木工の右90度回転ボタンは初期非表示にしてください");
assert.equal(boardActions.includes("shiftBoardUpButton"), false);
assert.equal(boardActions.includes("swapBoard"), false);
assert.equal(boardActions.includes("cooking-effect-button"), false);
