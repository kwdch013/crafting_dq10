const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.match(mainJs, /function isFixedLayoutRecipeEditor\(config\)/, "固定マス職人のレシピ追加判定を追加してください");
assert.match(mainJs, /function isFixedTargetRecipeEditor\(config\)/, "固定基準値職人のレシピ追加判定を追加してください");
assert.match(mainJs, /renderFixedLayoutAddRecipeItems\(config, seedItems\)/, "固定配置のレシピ入力を共通化してください");
assert.match(mainJs, /appendFixedLayoutAddRecipeCell/, "固定配置セルを追加してください");
assert.match(mainJs, /collectFixedLayoutAddRecipeItems\(config\)/, "固定配置セルからレシピを保存してください");
assert.match(mainJs, /createRecipeItemNumber\("target", "基準値"/, "固定基準値職人では基準値だけを入力してください");

const fixedTargetCollectorStart = mainJs.indexOf("function collectFixedLayoutAddRecipeItems");
const fixedTargetCollectorEnd = mainJs.indexOf("function addRecipeItemRow", fixedTargetCollectorStart);
const fixedTargetCollector = mainJs.slice(fixedTargetCollectorStart, fixedTargetCollectorEnd);
assert.match(fixedTargetCollector, /successMin: target/, "固定基準値職人は下限を基準値と同じにしてください");
assert.match(fixedTargetCollector, /successMax: target/, "固定基準値職人は上限を基準値と同じにしてください");

[
	"api/data/crafts/woodworking/recipes.json",
	"api/data/crafts/sewing/recipes.json",
].forEach((file) => {
	const recipes = JSON.parse(fs.readFileSync(file, "utf8"));
	recipes.forEach((recipe) => {
		assert.equal(recipe.traitId, undefined, `${file} の特性は一旦空欄にしてください`);
		recipe.items.forEach((item) => {
			assert.equal(item.successMin, item.target, `${file} ${recipe.id} ${item.id} の下限は固定基準値と同じにしてください`);
			assert.equal(item.successMax, item.target, `${file} ${recipe.id} ${item.id} の上限は固定基準値と同じにしてください`);
		});
	});
});
