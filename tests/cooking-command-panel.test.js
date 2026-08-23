const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const commandPanelMatch = html.match(/<div class="cooking-command-panel" id="cookingCommandPanel" hidden>([\s\S]*?)<\/div>\s*<div id="layoutBoard"/);

assert.ok(commandPanelMatch, "調理専用コマンド領域が存在すること");

const commandPanel = commandPanelMatch[1];
const buttonLabels = [...commandPanel.matchAll(/<button\b[^>]*>([^<]*)<\/button>/g)]
	.map((match) => match[1].trim());

assert.deepEqual(buttonLabels, [
	"ミラクルグリル",
	"適用",
	"通常",
	"強火焼き",
	"弱火焼き",
	"光を解除",
	"なし",
	"上下左右が光る",
	"四隅が戻る",
	"光を一括切替",
	"-200℃",
	"-50℃",
	"+50℃",
	"+200℃",
	"ターン送り",
	"再生布",
]);
assert.equal(commandPanel.includes("board-actions"), false);
assert.ok(commandPanel.includes("miracleGrillResult"), "ミラクルグリル結果表示を持つこと");
