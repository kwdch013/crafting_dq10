const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.match(html, /id="recipeCategoryLabel"/, "大項目の表示領域を追加してください");
assert.match(html, /id="recipeCategorySelect"/, "大項目selectを追加してください");
assert.match(html, /id="recipeSelectTitle"/, "小項目ラベルを動的に変更できるようにしてください");

assert.match(mainJs, /recipeCategorySelect: document\.querySelector\("#recipeCategorySelect"\)/);
assert.match(mainJs, /function renderRecipeCategoryOptions\(\)/);
assert.match(mainJs, /function applyRecipeCategory\(categoryId\)/);
assert.match(mainJs, /elements\.recipeCategorySelect\?\.addEventListener\("change"/);
assert.match(mainJs, /recipeSubcategoryLabel/, "小項目ラベル設定を参照してください");
