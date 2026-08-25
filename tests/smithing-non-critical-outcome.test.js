const assert = require("node:assert/strict");
const engine = require("../app/engine.js");

// 会心時確定(guaranteed)の際、非会心(通常)だった場合に基準範囲へ入るか不足するかを判定します。
function analyzeGuaranteed(current, overrides = {}) {
  const ingredient = { current, successMin: 60, successMax: 75, target: 68, locked: false };
  const technique = {
    normalMin: overrides.normalMin ?? 5,
    normalMax: overrides.normalMax ?? 8,
    criticalMin: overrides.criticalMin ?? 10,
    criticalMax: overrides.criticalMax ?? 16,
    criticalMultiplier: 2,
    forcedCritical: false,
  };
  return engine.analyzeIngredient(ingredient, technique, "random-in-range", {});
}

{
  // 非会心の最小値でも基準下限に届き、必ず基準範囲へ入るケース。
  const result = analyzeGuaranteed(52, { normalMin: 8, normalMax: 15, criticalMin: 20, criticalMax: 30 });
  assert.equal(result.status, "guaranteed");
  assert.equal(result.nonCriticalOutcome, "non-critical-in-range");
  assert.equal(result.nonCriticalOutcomeLabel, "非会心時基準範囲突入確定");
}

{
  // 非会心の値によって基準範囲へ入るかどうかが分かれるケース。
  const result = analyzeGuaranteed(50, { normalMin: 8, normalMax: 15, criticalMin: 20, criticalMax: 30 });
  assert.equal(result.status, "guaranteed");
  assert.equal(result.nonCriticalOutcome, "non-critical-in-range-chance");
  assert.equal(result.nonCriticalOutcomeLabel, "非会心時突入の可能性");
}

{
  // 非会心の最大値でも基準下限に届かず、必ず不足するケース。
  const result = analyzeGuaranteed(40, { normalMin: 8, normalMax: 15, criticalMin: 30, criticalMax: 35 });
  assert.equal(result.status, "guaranteed");
  assert.equal(result.nonCriticalOutcome, "non-critical-shortage");
  assert.equal(result.nonCriticalOutcomeLabel, "非会心時不足");
}

{
  // 会心時確定以外のステータスでは補足表示を出しません。
  const result = analyzeGuaranteed(65, { normalMin: 8, normalMax: 15, criticalMin: 20, criticalMax: 30 });
  assert.notEqual(result.status, "guaranteed");
  assert.equal(result.nonCriticalOutcome, null);
  assert.equal(result.nonCriticalOutcomeLabel, "");
}

console.log("smithing-non-critical-outcome.test.js OK");
