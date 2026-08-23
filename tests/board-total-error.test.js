const assert = require("node:assert/strict");
const fs = require("node:fs");

const indexHtml = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");
const styles = fs.readFileSync("app/styles.css", "utf8");

assert.match(
	indexHtml,
	/id="boardTotalError"/,
	"BOARD内に全体誤差の表示領域を用意してください",
);
assert.match(
	mainJs,
	/elements\.boardTotalError\.textContent = `全体の誤差: \$\{analysis\.totalError\}`/,
	"BOARD描画時に解析結果の全体誤差を表示してください",
);
assert.match(
	mainJs,
	/elements\.boardTotalError\.hidden = !Number\.isFinite\(analysis\.totalError\)/,
	"全体誤差を定義できない職人では表示領域を非表示にしてください",
);
assert.match(
	styles,
	/\.board-total-error/,
	"全体誤差をBOARD内で識別できるスタイルを定義してください",
);
