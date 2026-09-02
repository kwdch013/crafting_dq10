const assert = require("node:assert/strict");
const recipeArchive = require("../app/recipe-archive.js");
const { loadFallbackRecipes } = require("./helpers/recipe-loader.js");

const cookingRecipes = loadFallbackRecipes("cooking");
const toolSmithingRecipes = loadFallbackRecipes("tool-smithing");

const japaneseCollator = new Intl.Collator("ja-JP", { numeric: true, sensitivity: "base" });

function getRecipeByName(recipes, name) {
  return recipes.find((recipe) => recipe.name === name);
}

function getItemByGridCell(recipe, row, column) {
  return recipe.items.find((item) => item.gridCell.row === row && item.gridCell.column === column);
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
  assert.deepEqual(Array.from(recipe.items, (item) => ({
    row: item.gridCell.row,
    column: item.gridCell.column,
  })), [
    { row: 1, column: 2 },
    { row: 2, column: 1 },
    { row: 2, column: 2 },
    { row: 2, column: 3 },
    { row: 3, column: 1 },
    { row: 3, column: 3 },
  ]);

  for (const [row, column] of [[1, 2], [2, 1], [2, 2], [3, 1]]) {
    const item = getItemByGridCell(recipe, row, column);
    assert.equal(item.target, 155);
    assert.equal(item.successMin, 140);
    assert.equal(item.successMax, 170);
    assert.equal(item.ingredientGroupLabel, "魚");
    assert.equal(item.ingredientSize, 2);
  }

  const topGroupId = getItemByGridCell(recipe, 1, 2).ingredientGroupId;
  const leftGroupId = getItemByGridCell(recipe, 2, 1).ingredientGroupId;
  assert.ok(topGroupId);
  assert.ok(leftGroupId);
  assert.equal(getItemByGridCell(recipe, 2, 2).ingredientGroupId, topGroupId);
  assert.equal(getItemByGridCell(recipe, 3, 1).ingredientGroupId, leftGroupId);
  assert.notEqual(topGroupId, leftGroupId);

  for (const [row, column] of [[2, 3], [3, 3]]) {
    const item = getItemByGridCell(recipe, row, column);
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
    false,
    "全職人でレシピ選択欄に手入力項目を表示しないでください",
  );
}

{
  assertSortedByCategoryThenName(cookingRecipes);
}

{
  assertBattlePazzaRecipe(getRecipeByName(cookingRecipes, "バトルパッツァ"));
}

{
  assertSortedByCategoryThenName(toolSmithingRecipes);
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
  assertToolSmithingRecipe(getRecipeByName(toolSmithingRecipes, "光のフライパン"), {
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
