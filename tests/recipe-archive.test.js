const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const recipeArchive = require("../app/recipe-archive.js");
const cookingRecipes = require("../api/data/crafts/cooking/recipes.json");

const visibleCookingRecipeNames = [
  "きようさにくまん",
  "パワフルステーキ",
  "あいじょうオムレツ",
  "バトルステーキ",
  "スマッシュポテト",
  "バランスパスタ",
  "クイックケーキ",
  "ファイアタルト",
  "アイスタルト",
  "ライトタルト",
  "ダークタルト",
  "ストームタルト",
  "ヒールカルボナーラ",
];

function loadFallbackCookingRecipes() {
  const context = {
    recipes: null,
  };
  context.registerDQ10CraftRecipes = (craftId, recipes) => {
    if (craftId === "cooking") {
      context.recipes = recipes;
    }
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync("app/crafts/cooking/recipes.js", "utf8"),
    context,
  );
  return context.recipes;
}

{
  const recipes = [
    { id: "visible", name: "表示" },
    { id: "archived", name: "非表示", archived: true },
  ];

  assert.deepEqual(
    recipeArchive.getVisibleRecipes(recipes).map((recipe) => recipe.id),
    ["visible"],
  );
  assert.deepEqual(recipeArchive.getVisibleRecipes(null), []);
}

{
  assert.deepEqual(
    recipeArchive.getVisibleRecipes(cookingRecipes).map((recipe) => recipe.name),
    visibleCookingRecipeNames,
  );
}

{
  assert.deepEqual(
    Array.from(recipeArchive.getVisibleRecipes(loadFallbackCookingRecipes()), (recipe) => recipe.name),
    visibleCookingRecipeNames,
  );
}
