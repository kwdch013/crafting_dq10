const assert = require("node:assert/strict");

const { loadFallbackRecipes } = require("./helpers/recipe-loader.js");

const craftIds = [
  "tool-smithing",
  "weapon-smithing",
  "armor-smithing",
  "sewing",
  "woodworking",
  "cooking",
];

for (const craftId of craftIds) {
  const recipes = loadFallbackRecipes(craftId);
  for (const recipe of recipes) {
    assert.ok(
      typeof recipe.categoryId === "string" && recipe.categoryId.length > 0,
      `${craftId} の ${recipe.id} は空でない categoryId を持つ必要があります`,
    );
  }
}
