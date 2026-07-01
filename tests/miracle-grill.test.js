const assert = require("node:assert/strict");
const engine = require("../app/engine.js");

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
