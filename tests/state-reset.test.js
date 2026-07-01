const assert = require("node:assert/strict");
const stateReset = require("../app/state-reset.js");

const recipes = [
  { id: "recipe-1", name: "料理A" },
  { id: "recipe-2", name: "料理B" },
];

{
  assert.equal(
    stateReset.findResetRecipe(recipes, { recipeId: "recipe-2", recipeName: "料理A" })?.id,
    "recipe-2",
  );
}

{
  assert.equal(
    stateReset.findResetRecipe(recipes, { recipeId: "custom", recipeName: "料理B" })?.id,
    "recipe-2",
  );
}

{
  assert.deepEqual(
    stateReset.getResetFocusSelection({
      level: 72,
      toolId: "miracle-frying-pan",
      toolStars: 3,
    }),
    {
      level: 72,
      toolId: "miracle-frying-pan",
      toolStars: 3,
    },
  );
}
