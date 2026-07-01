const assert = require("node:assert/strict");
const engine = require("../app/engine.js");

globalThis.DQ10CookingDamage = {
  distributions: {
    center: {
      normal: [12, 13, 14, 15, 16, 17, 18],
    },
    cross: {
      normal: [6, 7, 7, 8, 8, 9, 9],
    },
  },
};

{
  const ingredient = {
    id: "meat",
    current: 99,
    target: 100,
    successMin: 90,
    successMax: 110,
  };
  const result = engine.applyMiracleGrill(ingredient);

  assert.equal(result.outcome, "hit");
  assert.equal(result.before, 99);
  assert.equal(result.after, 100);
  assert.equal(result.target, 100);
  assert.equal(result.diff, 0);
  assert.equal(ingredient.current, 100);
  assert.equal(ingredient.locked, true);
  assert.equal(ingredient.lockJudgement, "true-critical");
  assert.equal(ingredient.lockJudgementLabel, "本会心固定");
}

{
  const ingredient = {
    id: "meat",
    current: 101,
    target: 100,
    successMin: 90,
    successMax: 110,
  };
  const result = engine.applyMiracleGrill(ingredient);

  assert.equal(result.outcome, "miss");
  assert.equal(result.before, 101);
  assert.equal(result.after, 101);
  assert.equal(result.target, 100);
  assert.equal(result.diff, -1);
  assert.equal(ingredient.current, 101);
  assert.equal(ingredient.locked, false);
  assert.equal(ingredient.lockJudgement, "");
}

{
  const ingredient = {
    id: "fish",
    current: 120,
    successMin: 100,
    successMax: 140,
  };
  const result = engine.applyMiracleGrill(ingredient);

  assert.equal(result.outcome, "hit");
  assert.equal(result.target, 120);
  assert.equal(ingredient.current, 120);
  assert.equal(ingredient.locked, true);
}

{
  const ingredients = [
    {
      id: "meat-left",
      current: 90,
      target: 100,
      successMin: 90,
      successMax: 110,
      optionId: "center",
    },
    {
      id: "meat-right",
      current: 94,
      target: 104,
      successMin: 94,
      successMax: 114,
      optionId: "center",
    },
  ];
  const result = engine.applyMiracleGrillToIngredients(ingredients, {
    heat: "normal",
  });

  assert.equal(result.outcome, "hit");
  assert.equal(result.results.length, 2);
  assert.deepEqual(ingredients.map((ingredient) => ingredient.current), [100, 104]);
  assert.deepEqual(ingredients.map((ingredient) => ingredient.locked), [true, true]);
}

{
  const ingredient = {
    id: "center",
    current: 76,
    target: 100,
    successMin: 90,
    successMax: 110,
    optionId: "center",
  };
  const result = engine.applyMiracleGrill(ingredient, { heat: "normal" });

  assert.equal(result.outcome, "hit");
  assert.equal(result.observedGain, 24);
  assert.equal(result.lockJudgement, "possible-fake-critical");
  assert.equal(result.lockJudgementLabel, "偽会心の可能性あり");
  assert.equal(ingredient.lockJudgement, "possible-fake-critical");
}

{
  const ingredient = {
    id: "cross",
    current: 91,
    target: 100,
    successMin: 90,
    successMax: 110,
    optionId: "cross",
  };
  const result = engine.applyMiracleGrill(ingredient, { heat: "normal" });

  assert.equal(result.outcome, "hit");
  assert.equal(result.observedGain, 9);
  assert.equal(result.lockJudgement, "true-critical");
  assert.equal(result.lockJudgementLabel, "本会心固定");
}
