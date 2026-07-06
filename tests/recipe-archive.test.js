const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const recipeArchive = require("../app/recipe-archive.js");
const cookingRecipes = require("../api/data/crafts/cooking/recipes.json");
const toolSmithingRecipes = require("../api/data/crafts/tool-smithing/recipes.json");

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

const visibleToolSmithingRecipeNames = [
  "超鍛冶ハンマー",
  "超木工刀",
  "超さいほう針",
  "超フライパン",
  "超錬金ランプ",
  "超錬金ツボ",
  "奇跡の鍛冶ハンマー",
  "奇跡の木工刀",
  "奇跡のさいほう針",
  "奇跡のフライパン",
  "奇跡の錬金ランプ",
  "奇跡の錬金ツボ",
  "光の鍛冶ハンマー",
  "光の木工刀",
  "光のさいほう針",
  "光のフライパン",
  "光の錬金ランプ",
  "光の錬金ツボ",
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

{
  assert.deepEqual(
    recipeArchive.getVisibleRecipes(toolSmithingRecipes).map((recipe) => recipe.name),
    visibleToolSmithingRecipeNames,
  );
  assert.deepEqual(
    Array.from(recipeArchive.getVisibleRecipes(loadFallbackToolSmithingRecipes()), (recipe) => recipe.name),
    visibleToolSmithingRecipeNames,
  );
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
