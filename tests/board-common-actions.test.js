const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const boardActionsMatch = html.match(/<div class="board-actions" id="boardActions">([\s\S]*?)<\/div>/);

assert.ok(boardActionsMatch, "BOARD操作領域が存在すること");

const boardActions = boardActionsMatch[1];
const buttonLabels = [...boardActions.matchAll(/<button\b[^>]*>([^<]*)<\/button>/g)]
	.map((match) => match[1].trim());

assert.deepEqual(buttonLabels, ["左90°", "右90°", "戻る", "進む", "Reset"]);
assert.match(boardActions, /id="resetButton"/, "ResetボタンはBOARD操作領域に配置してください");
assert.match(boardActions, /id="rotateWoodLeftButton"[^>]*hidden/, "木工の左90度回転ボタンは初期非表示にしてください");
assert.match(boardActions, /id="rotateWoodRightButton"[^>]*hidden/, "木工の右90度回転ボタンは初期非表示にしてください");
assert.equal(boardActions.includes("shiftBoardUpButton"), false);
assert.equal(boardActions.includes("swapBoard"), false);
assert.equal(boardActions.includes("cooking-effect-button"), false);

// Reset はヘッダーではなくBOARD内にのみ存在することを保証する
const topbarActionsMatch = html.match(/<div class="topbar-actions">([\s\S]*?)<\/div>/);
assert.ok(topbarActionsMatch, "ヘッダー操作領域が存在すること");
assert.equal(topbarActionsMatch[1].includes("resetButton"), false, "Resetボタンはヘッダーから削除してください");
assert.equal((html.match(/id="resetButton"/g) || []).length, 1, "Resetボタンは1つだけ配置してください");

