const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// recipes.js を実行し、登録関数に渡される職人別レシピを取得します。
function loadFallbackRecipes(craftId) {
  const context = {
    recipes: null,
  };
  context.registerDQ10CraftRecipes = (registeredCraftId, recipes) => {
    if (registeredCraftId === craftId) {
      context.recipes = recipes;
    }
  };

  const recipesPath = path.join("app", "crafts", craftId, "recipes.js");
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(recipesPath, "utf8"), context, { filename: recipesPath });

  if (!Array.isArray(context.recipes)) {
    throw new Error(`${craftId} のフォールバックレシピを読み込めません`);
  }

  return context.recipes;
}

module.exports = { loadFallbackRecipes };
