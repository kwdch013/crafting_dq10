const assert = require("node:assert/strict");
const fs = require("node:fs");

const agents = fs.readFileSync("AGENTS.md", "utf8");

assert.match(
	agents,
	/基本設定の変更以外でボタンやBOARDの位置が動かない/,
	"AGENTS.mdに表示切替によるレイアウト安定性のルールを記載してください",
);
assert.match(
	agents,
	/表示有無で高さが変わる領域は、非表示時も同等の表示領域を確保/,
	"AGENTS.mdに表示領域確保のルールを記載してください",
);
