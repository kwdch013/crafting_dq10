const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const recipeArchive = require("../app/recipe-archive.js");
const cookingRecipes = require("../api/data/crafts/cooking/recipes.json");
const toolSmithingRecipes = require("../api/data/crafts/tool-smithing/recipes.json");

const japaneseCollator = new Intl.Collator("ja-JP", { numeric: true, sensitivity: "base" });

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

function loadFallbackToolSmithingRecipes() {
  const context = {
    recipes: null,
  };
  context.registerDQ10CraftRecipes = (craftId, recipes) => {
    if (craftId === "tool-smithing") {
      context.recipes = recipes;
    }
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync("app/crafts/tool-smithing/recipes.js", "utf8"),
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

function compareRecipeOrder(left, right) {
  const leftCategory = left.category || left.categoryId || "";
  const rightCategory = right.category || right.categoryId || "";
  if (leftCategory && !rightCategory) {
    return -1;
  }
  if (!leftCategory && rightCategory) {
    return 1;
  }

  const categoryOrder = japaneseCollator.compare(leftCategory, rightCategory);
  if (categoryOrder !== 0) {
    return categoryOrder;
  }

  return japaneseCollator.compare(left.name || "", right.name || "");
}

function assertSortedByCategoryThenName(recipes) {
  const expected = recipes
    .filter((recipe) => recipe.archived !== true)
    .slice()
    .sort(compareRecipeOrder)
    .map((recipe) => recipe.name);

  assert.deepEqual(
    recipeArchive.getVisibleRecipes(recipes).map((recipe) => recipe.name),
    expected,
    "レシピはカテゴリごとに分類し、同じカテゴリ内は五十音順にしてください",
  );
}

function assertBattlePazzaRecipe(recipe) {
  assert.ok(recipe, "バトルパッツァのレシピが登録されていません");
  assert.equal(recipe.category, "魚料理");
  assert.equal(recipe.categoryId, "fish-dishes");
  assert.equal(recipe.traitId, "light-return");
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
    assert.equal(item.ingredientGroupLabel, "魚");
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

function assertToolSmithingRecipe(recipe, expected) {
  assert.ok(recipe, `${expected.name}のレシピが登録されていません`);
  assert.equal(recipe.category, expected.category);
  assert.equal(recipe.categoryId, expected.categoryId);
  assert.equal(recipe.archived, undefined);
  assert.deepEqual(
    Array.from(recipe.items, (item) => ({
      row: item.gridCell.row,
      column: item.gridCell.column,
    })),
    expected.gridCells,
  );

  expected.ranges.forEach(([successMin, successMax], index) => {
    const item = recipe.items[index];
    assert.equal(item.current, 0);
    assert.equal(item.successMin, successMin);
    assert.equal(item.successMax, successMax);
  });
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
  const recipes = [
    { id: "hidden", name: "あ", category: "肉料理", categoryId: "meat", archived: true },
    { id: "sweets-2", name: "クイックケーキ", category: "スイーツ", categoryId: "sweets" },
    { id: "meat-2", name: "きようさにくまん", category: "肉料理", categoryId: "meat" },
    { id: "fish-1", name: "バトルパッツァ", category: "魚料理", categoryId: "fish" },
    { id: "meat-1", name: "あいじょうオムレツ", category: "肉料理", categoryId: "meat" },
    { id: "sweets-1", name: "アイスタルト", category: "スイーツ", categoryId: "sweets" },
    { id: "uncategorized", name: "未分類", category: "", categoryId: "" },
  ];

  assert.deepEqual(
    recipeArchive.getVisibleRecipes(recipes).map((recipe) => recipe.id),
    ["sweets-1", "sweets-2", "fish-1", "meat-1", "meat-2", "uncategorized"],
    "レシピはカテゴリごとに分類し、同じカテゴリ内は五十音順にしてください",
  );
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
  assertSortedByCategoryThenName(cookingRecipes);
}

{
  assertSortedByCategoryThenName(loadFallbackCookingRecipes());
}

{
  assertBattlePazzaRecipe(getRecipeByName(cookingRecipes, "バトルパッツァ"));
  assertBattlePazzaRecipe(getRecipeByName(loadFallbackCookingRecipes(), "バトルパッツァ"));
}

{
  assertSortedByCategoryThenName(toolSmithingRecipes);
  assertSortedByCategoryThenName(loadFallbackToolSmithingRecipes());
}

{
  assertToolSmithingRecipe(getRecipeByName(toolSmithingRecipes, "超鍛冶ハンマー"), {
    name: "超鍛冶ハンマー",
    category: "ハンマー",
    categoryId: "smithing-hammer",
    gridCells: [
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 1 },
    ],
    ranges: [[130, 140], [105, 111], [105, 113], [130, 140], [90, 96]],
  });
  assertToolSmithingRecipe(getRecipeByName(loadFallbackToolSmithingRecipes(), "光のフライパン"), {
    name: "光のフライパン",
    category: "フライパン",
    categoryId: "frying-pan",
    gridCells: [
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 1 },
      { row: 3, column: 2 },
      { row: 4, column: 1 },
    ],
    ranges: [[92, 102], [110, 120], [134, 146], [158, 164], [158, 164], [92, 102], [92, 102]],
  });
}
