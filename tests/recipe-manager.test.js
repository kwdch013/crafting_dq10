const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.doesNotMatch(html, /id="exportButton"/, "Exportボタンを画面上部に残さないでください");
assert.doesNotMatch(html, /id="importInput"/, "Import入力を画面上部に残さないでください");
assert.match(html, /id="recipeListButton"/, "レシピリストボタンを追加してください");
assert.match(html, /id="recipeListDialog"/, "レシピリストの階層表示ダイアログを追加してください");
assert.match(html, /id="addRecipeDialog"/, "新規追加ウィンドウを追加してください");

[
	"function loadUserRecipeStore()",
	"function getAllCraftRecipes(craftId)",
	"function renderRecipeManagerCategories()",
	"function openAddRecipeDialog()",
	"function addManagedRecipe(event)",
	"function collectAddRecipeItems(config)",
	"function getRecipeCategoryTemplateItems(config, categoryId)",
	"elements.recipeListButton.addEventListener(\"click\", openRecipeListDialog)",
].forEach((pattern) => {
	assert.match(mainJs, new RegExp(pattern.replace(/[()]/g, "\\$&")), `${pattern} を実装してください`);
});

assert.match(mainJs, /getRecipeCategoryOptions\(config\)/, "大項目ありの職人に対応してください");
assert.match(mainJs, /getTraits\(config\)/, "特性ありの職人に対応してください");
assert.match(mainJs, /config\.itemOptions/, "職人別の位置・部位入力に対応してください");
