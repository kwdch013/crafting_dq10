const assert = require("node:assert/strict");
const fs = require("node:fs");

[
	"app/crafts/shared/smithing-component.js",
	"app/crafts/cooking/component.js",
	"app/crafts/sewing/component.js",
	"app/crafts/woodworking/component.js",
].forEach((file) => {
	const source = fs.readFileSync(file, "utf8");
	assert.match(source, /\/\/ [ぁ-んァ-ヶ一-龠]/, `${file} に日本語コメントを追加してください`);
	assert.match(source, /function [A-Za-z0-9_]+\(/, `${file} に関数定義を置いてください`);
});

assert.match(
	fs.readFileSync("AGENTS.md", "utf8"),
	/職人別コンポーネント/,
	"AGENTS.md に職人別コンポーネント方針を記載してください",
);
