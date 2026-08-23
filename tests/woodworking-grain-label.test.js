const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");
const woodworkingConfigJs = fs.readFileSync("app/crafts/woodworking/config.js", "utf8");

assert.match(mainJs, /function getItemOptionFieldLabel\(config\)/, "職人別のoptionId入力ラベルを返してください");
assert.match(mainJs, /getItemOptionFieldLabel\(config\)/, "optionId入力欄のラベルは職人別ヘルパーを使ってください");
assert.match(woodworkingConfigJs, /itemOptionLabel: "木目"/, "木工のoptionId入力欄は木目と表示してください");
assert.doesNotMatch(
	mainJs,
	/createRecipeItemSelect\("optionId", "位置"/,
	"木工に位置ラベルが出ないよう、optionId入力欄へ固定の位置ラベルを渡さないでください",
);
