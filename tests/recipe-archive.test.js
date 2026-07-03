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
  "バトルパッツァ",
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

function getRecipeByName(recipes, name) {
  return recipes.find((recipe) => recipe.name === name);
}

function getItemById(recipe, id) {
  return recipe.items.find((item) => item.id === id);
}

function assertBattlePazzaRecipe(recipe) {
  assert.ok(recipe, "バトルパッツァのレシピが登録されていません");
  assert.equal(recipe.category, "魚料理");
  assert.equal(recipe.categoryId, "fish-dishes");
  assert.equal(recipe.traitId, "light");
  assert.equal(recipe.archived, undefined);
  assert.deepEqual(Array.from(recipe.items, (item) => item.id), [
    "slot-1-2",
    "slot-2-1",
    "slot-2-2",
    "slot-2-3",
    "slot-3-1",
    "slot-3-3",
  ]);

  for (const id of ["slot-1-2", "slot-2-1", "slot-2-2", "slot-3-1"]) {
    const item = getItemById(recipe, id);
    assert.equal(item.target, 155);
    assert.equal(item.successMin, 140);
    assert.equal(item.successMax, 170);
    assert.equal(item.ingredientGroupLabel, "魚の切り身");
    assert.equal(item.ingredientSize, 2);
  }

  assert.equal(getItemById(recipe, "slot-1-2").ingredientGroupId, "battle-pazza-fish-top");
  assert.equal(getItemById(recipe, "slot-2-2").ingredientGroupId, "battle-pazza-fish-top");
  assert.equal(getItemById(recipe, "slot-2-1").ingredientGroupId, "battle-pazza-fish-left");
  assert.equal(getItemById(recipe, "slot-3-1").ingredientGroupId, "battle-pazza-fish-left");

  for (const id of ["slot-2-3", "slot-3-3"]) {
    const item = getItemById(recipe, id);
    assert.equal(item.target, 175);
    assert.equal(item.successMin, 160);
    assert.equal(item.successMax, 190);
    assert.equal(item.ingredientGroupLabel, "野菜");
    assert.equal(item.ingredientGroupId, undefined);
    assert.equal(item.ingredientSize, undefined);
  }
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
  assert.equal(
    recipeArchive.shouldShowCustomRecipeOption({ id: "cooking", allowCustomRecipes: false }),
    false,
  );
  assert.equal(
    recipeArchive.shouldShowCustomRecipeOption({ id: "weapon-smithing" }),
    true,
  );
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

{
  assertBattlePazzaRecipe(getRecipeByName(cookingRecipes, "バトルパッツァ"));
  assertBattlePazzaRecipe(getRecipeByName(loadFallbackCookingRecipes(), "バトルパッツァ"));
}
