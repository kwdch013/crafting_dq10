const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.doesNotMatch(html, /id="exportButton"/, "Exportボタンを画面上部に残さないでください");
assert.doesNotMatch(html, /id="importInput"/, "Import入力を画面上部に残さないでください");
assert.match(html, /id="recipeListButton"/, "レシピリストボタンを追加してください");
assert.match(html, /id="recipeListDialog"/, "レシピリストの階層表示ダイアログを追加してください");
assert.match(html, /id="addRecipeDialog"/, "新規追加ウィンドウを追加してください");
assert.match(html, /id="addRecipeDialogTitle"/, "追加・編集ウィンドウの見出しを切り替えられるようにしてください");
assert.match(html, /id="saveRecipeButton"/, "追加・編集ウィンドウの保存ボタンを切り替えられるようにしてください");

[
	"function loadUserRecipeStore()",
	"function getAllCraftRecipes(craftId)",
	"function renderRecipeManagerCategories()",
	"function openAddRecipeDialog()",
	"function openEditRecipeDialog(config, recipe)",
	"function saveManagedRecipe(event)",
	"function addManagedRecipe(event)",
	"function persistRecipeToApi(craftId, recipe)",
	"function deleteRecipeFromApi(craftId, recipeId)",
	"function collectAddRecipeItems(config)",
	"function getRecipeCategoryTemplateItems(config, categoryId)",
	"elements.recipeListButton.addEventListener(\"click\", openRecipeListDialog)",
].forEach((pattern) => {
	assert.match(mainJs, new RegExp(pattern.replace(/[()]/g, "\\$&")), `${pattern} を実装してください`);
});

assert.match(mainJs, /getRecipeCategoryOptions\(config\)/, "大項目ありの職人に対応してください");
assert.match(mainJs, /getTraits\(config\)/, "特性ありの職人に対応してください");
assert.match(mainJs, /config\.itemOptions/, "職人別の位置・部位入力に対応してください");
assert.match(mainJs, /openEditRecipeDialog\(config, recipe\)/, "レシピ名クリックで編集画面を開いてください");
assert.match(mainJs, /managedRecipeEditId/, "編集中レシピIDを保持してください");
assert.match(mainJs, /userRecipeMap/, "既存レシピをユーザー編集内容で上書きできるようにしてください");
assert.match(mainJs, /method: "PUT"/, "レシピ保存時にAPI側のrecipes.jsonへ反映してください");
assert.match(mainJs, /method: "DELETE"/, "レシピ削除時にAPI側のrecipes.jsonから除外してください");
assert.doesNotMatch(mainJs, /customOption\.textContent = "手入力"/, "全職人でレシピ選択欄に手入力項目を表示しないでください");
assert.match(mainJs, /function isSmithingRecipeEditor\(config\)/, "鍛冶職人のレシピ追加は専用の配置入力にしてください");
assert.match(mainJs, /function renderSmithingAddRecipeItems\(config, seedItems\)/, "鍛冶職人の配置どおりに基準範囲入力を表示してください");
assert.match(mainJs, /function collectSmithingAddRecipeItems\(config\)/, "鍛冶職人は入力済みセルだけをレシピマスとして保存してください");
assert.match(mainJs, /recipe-layout-cell/, "鍛冶職人のレシピ追加は配置セルで入力してください");
assert.match(mainJs, /elements\.addRecipeItemButton\.hidden = true/, "鍛冶職人ではマス追加ボタンを非表示にしてください");
assert.match(mainJs, /getVisibleSmithingRecipeItems\(seedItems\)/, "鍛冶職人ではレシピに含まれるマスだけを表示してください");
assert.match(mainJs, /cell\.style\.gridRow = String\(rowIndex\)/, "鍛冶職人の入力セルは実際の行位置へ配置してください");
assert.match(mainJs, /cell\.style\.gridColumn = String\(columnIndex\)/, "鍛冶職人の入力セルは実際の列位置へ配置してください");
const smithingCellStart = mainJs.indexOf("function appendSmithingAddRecipeCell");
const smithingCellEnd = mainJs.indexOf("function appendAddRecipeItemRow", smithingCellStart);
const smithingCellFunction = mainJs.slice(smithingCellStart, smithingCellEnd);
assert.match(smithingCellFunction, /createRecipeItemNumber\("successMin"/, "鍛冶職人の配置セルに下限入力を出してください");
assert.match(smithingCellFunction, /createRecipeItemNumber\("successMax"/, "鍛冶職人の配置セルに上限入力を出してください");
assert.doesNotMatch(smithingCellFunction, /createRecipeItemInput\("name"/, "鍛冶職人の配置セルにマス名入力を出さないでください");
