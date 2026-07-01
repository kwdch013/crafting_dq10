const assert = require("node:assert/strict");
const boardLayout = require("../app/board-layout.js");

function ingredient(id, row, column, groupId = "", groupLabel = "肉") {
  return {
    id,
    ingredientGroupId: groupId,
    ingredientGroupLabel: groupLabel,
    gridCell: { row, column },
  };
}

function positionById(moves) {
  return Object.fromEntries(moves.map((move) => [
    move.ingredient.id,
    [move.gridCell.row, move.gridCell.column],
  ]));
}

{
  const ingredients = [
    ingredient("top-left", 1, 2, "top"),
    ingredient("top-right", 1, 3, "top"),
    ingredient("bottom-left", 3, 1, "bottom"),
    ingredient("bottom-right", 3, 2, "bottom"),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[1]);
  const targetGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[3]);
  const moves = boardLayout.createSwapGroupMoves(selectedGroup, targetGroup);

  assert.deepEqual(positionById(moves), {
    "top-left": [3, 1],
    "top-right": [3, 2],
    "bottom-left": [1, 2],
    "bottom-right": [1, 3],
  });
  assert.equal(
    boardLayout.canApplyGroupMoves(
      ingredients,
      moves,
      new Set(ingredients.map((item) => item.id)),
      { rows: 3, columns: 3 },
    ),
    true,
  );
}

{
  const ingredients = [
    ingredient("left-top", 1, 1, "left"),
    ingredient("left-bottom", 2, 1, "left"),
    ingredient("right-top", 2, 3, "right"),
    ingredient("right-bottom", 3, 3, "right"),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[1]);
  const targetGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[3]);
  const moves = boardLayout.createSwapGroupMoves(selectedGroup, targetGroup);

  assert.deepEqual(positionById(moves), {
    "left-top": [2, 3],
    "left-bottom": [3, 3],
    "right-top": [1, 1],
    "right-bottom": [2, 1],
  });
}

{
  const ingredients = [
    ingredient("left", 1, 1, "pair"),
    ingredient("right", 1, 2, "pair"),
  ];

  assert.deepEqual(
    boardLayout.getIngredientGroupMembers(ingredients, ingredients[1]).map((item) => item.id),
    ["left", "right"],
  );
}

{
  const ingredients = [
    ingredient("first", 1, 1, "triple", "肉"),
    ingredient("second", 1, 2, "triple", "肉"),
    ingredient("third", 1, 3, "triple", "肉"),
  ];

  assert.deepEqual(
    boardLayout.getIngredientGroupMembers(ingredients, ingredients[1]).map((item) => item.id),
    ["second"],
  );
}

{
  const ingredients = [
    ingredient("noodle-left", 2, 1, "noodle", "麺"),
    ingredient("noodle-right", 2, 2, "noodle", "麺"),
  ];

  assert.deepEqual(
    boardLayout.getIngredientGroupMembers(ingredients, ingredients[0]).map((item) => item.id),
    ["noodle-left"],
  );
}

{
  const ingredients = [
    ingredient("pair-left", 2, 1, "pair"),
    ingredient("pair-right", 2, 2, "pair"),
    ingredient("upper-left", 1, 1),
    ingredient("upper-right", 1, 2),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[0]);
  const moves = boardLayout.createDirectionalSwapMoves(ingredients, selectedGroup, "up");

  assert.deepEqual(positionById(moves), {
    "pair-left": [1, 1],
    "pair-right": [1, 2],
    "upper-left": [2, 1],
    "upper-right": [2, 2],
  });
}

{
  const ingredients = [
    ingredient("pair-top", 1, 2, "pair"),
    ingredient("pair-bottom", 2, 2, "pair"),
    ingredient("right-top", 1, 3),
    ingredient("right-bottom", 2, 3),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[0]);
  const moves = boardLayout.createDirectionalSwapMoves(ingredients, selectedGroup, "right");

  assert.deepEqual(positionById(moves), {
    "pair-top": [1, 3],
    "pair-bottom": [2, 3],
    "right-top": [1, 2],
    "right-bottom": [2, 2],
  });
}

{
  const ingredients = [
    ingredient("pair-left", 2, 1, "pair"),
    ingredient("pair-right", 2, 2, "pair"),
    ingredient("single", 2, 3),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[0]);
  const moves = boardLayout.createDirectionalSwapMoves(ingredients, selectedGroup, "right");

  assert.deepEqual(positionById(moves), {
    "pair-left": [2, 2],
    "pair-right": [2, 3],
    "single": [2, 1],
  });
  assert.equal(
    boardLayout.canApplyGroupMoves(
      ingredients,
      moves,
      new Set(moves.map((move) => move.ingredient.id)),
      { rows: 3, columns: 3 },
    ),
    true,
  );
}

{
  const ingredients = [
    ingredient("pair-left", 2, 1, "pair"),
    ingredient("pair-right", 2, 2, "pair"),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[0]);
  const moves = boardLayout.createDirectionalSwapMoves(ingredients, selectedGroup, "right");

  assert.deepEqual(positionById(moves), {
    "pair-left": [2, 2],
    "pair-right": [2, 3],
  });
  assert.equal(
    boardLayout.canApplyGroupMoves(
      ingredients,
      moves,
      new Set(moves.map((move) => move.ingredient.id)),
      { rows: 3, columns: 3 },
    ),
    true,
  );
}

{
  const ingredients = [
    ingredient("pair-top", 1, 2, "pair"),
    ingredient("pair-bottom", 2, 2, "pair"),
    ingredient("single", 3, 2),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[0]);
  const moves = boardLayout.createDirectionalSwapMoves(ingredients, selectedGroup, "down");

  assert.deepEqual(positionById(moves), {
    "pair-top": [2, 2],
    "pair-bottom": [3, 2],
    "single": [1, 2],
  });
  assert.equal(
    boardLayout.canApplyGroupMoves(
      ingredients,
      moves,
      new Set(moves.map((move) => move.ingredient.id)),
      { rows: 3, columns: 3 },
    ),
    true,
  );
}

{
  const ingredients = [
    ingredient("pair-left", 2, 1, "pair"),
    ingredient("pair-right", 2, 2, "pair"),
    ingredient("lower-left", 3, 1),
    ingredient("lower-right", 3, 2),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[1]);
  const moves = boardLayout.createDirectionalSwapMoves(ingredients, selectedGroup, "down");

  assert.deepEqual(positionById(moves), {
    "pair-left": [3, 1],
    "pair-right": [3, 2],
    "lower-left": [2, 1],
    "lower-right": [2, 2],
  });
  assert.equal(
    boardLayout.canApplyGroupMoves(
      ingredients,
      moves,
      new Set(moves.map((move) => move.ingredient.id)),
      { rows: 3, columns: 3 },
    ),
    true,
  );
}

{
  const ingredients = [
    ingredient("pair-left", 2, 1, "pair"),
    ingredient("pair-right", 2, 2, "pair"),
    ingredient("single", 3, 1),
    ingredient("other-top", 3, 2, "other"),
    ingredient("other-bottom", 3, 3, "other"),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[0]);

  assert.equal(
    boardLayout.createDirectionalSwapMoves(ingredients, selectedGroup, "down"),
    null,
  );
}

{
  const ingredients = [
    ingredient("selected-numpad-2", 3, 2, "selected"),
    ingredient("selected-numpad-3", 3, 3, "selected"),
    ingredient("other-numpad-4", 2, 1, "other"),
    ingredient("other-numpad-5", 2, 2, "other"),
    ingredient("single-numpad-6", 2, 3),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[0]);

  assert.equal(
    boardLayout.createDirectionalSwapMoves(ingredients, selectedGroup, "up"),
    null,
  );
}

{
  const ingredients = [
    ingredient("pair-left", 2, 1, "pair"),
    ingredient("pair-right", 2, 2, "pair"),
    ingredient("single", 3, 2),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[0]);
  const moves = boardLayout.createDirectionalSwapMoves(ingredients, selectedGroup, "down");

  assert.deepEqual(positionById(moves), {
    "pair-left": [3, 1],
    "pair-right": [3, 2],
    "single": [2, 2],
  });
  assert.equal(
    boardLayout.canApplyGroupMoves(
      ingredients,
      moves,
      new Set(moves.map((move) => move.ingredient.id)),
      { rows: 3, columns: 3 },
    ),
    true,
  );
}

{
  const ingredients = [
    ingredient("pair-left", 2, 1, "pair"),
    ingredient("pair-right", 2, 2, "pair"),
  ];
  const selectedGroup = boardLayout.getIngredientGroupMembers(ingredients, ingredients[1]);

  assert.equal(
    boardLayout.getAdjacentDirectionForCell(selectedGroup, { row: 2, column: 3 }),
    "right",
  );
}
