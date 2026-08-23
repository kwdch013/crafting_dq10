const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = {
	window: {},
};
context.window = context;

vm.createContext(context);
[
	"app/crafts/registry.js",
	"app/crafts/woodworking/component.js",
].forEach((file) => {
	vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
});

const component = context.DQ10CraftComponents.woodworking;

assert.equal(typeof component.getGrainVisual, "function", "木工コンポーネントに木目ビジュアル解決を定義してください");

// 横木目(horizontal)は順目として、縦ストライプ用クラスと順目ラベルを返します。
{
	const visual = component.getGrainVisual({ optionId: "horizontal" });
	assert.equal(visual.orientation, "horizontal");
	assert.equal(visual.grain, "parallel");
	assert.equal(visual.grainLabel, "順目");
	assert.equal(visual.patternClass, "grain-parallel");
}

// 縦木目(vertical)は逆目として、横ボーダー用クラスと逆目ラベルを返します。
{
	const visual = component.getGrainVisual({ optionId: "vertical" });
	assert.equal(visual.orientation, "vertical");
	assert.equal(visual.grain, "against");
	assert.equal(visual.grainLabel, "逆目");
	assert.equal(visual.patternClass, "grain-against");
}

// optionId未設定や未知値は順目(横)として扱います。
{
	const visual = component.getGrainVisual({});
	assert.equal(visual.orientation, "horizontal");
	assert.equal(visual.grain, "parallel");
	assert.equal(component.getGrainVisual(null).orientation, "horizontal");
}

console.log("PASS woodworking-grain-visual");
