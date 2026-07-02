(function (global) {
  const statusLabels = {
    locked: "固定",
    "locked-critical": "本会心固定",
    guaranteed: "会心時確定",
    "normal-over-risk": "通常時超過の可能性あり",
    over: "超過中",
    "fake-critical-risk": "偽会心の可能性あり",
    shortage: "不足",
  };
  const statusRanks = {
    "locked-critical": 7,
    locked: 6,
    over: 5,
    guaranteed: 4,
    "normal-over-risk": 3,
    "fake-critical-risk": 2,
    shortage: 1,
  };

  function toNumber(value, fallback = 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function normalizeRange(min, max) {
    const normalizedMin = toNumber(min);
    const normalizedMax = toNumber(max);
    return normalizedMin <= normalizedMax
      ? [normalizedMin, normalizedMax]
      : [normalizedMax, normalizedMin];
  }

  function rangesOverlap(minA, maxA, minB, maxB) {
    return maxA >= minB && minA <= maxB;
  }

  function expandIntegerRange(range) {
    if (!Array.isArray(range)) {
      return [];
    }

    const [min, max] = normalizeRange(range[0], range[1]);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }

  function isCookingLightActive(state = {}, ingredient = {}) {
    if (state.traitId === "light") {
      return ingredient.isGlowing === true;
    }

    return state.traitId === "light-return" &&
      state.cookingEffectMode === "cross-glow" &&
      ingredient.optionId === "cross";
  }

  function resolveCookingDamageSource(state = {}, ingredient = {}, conditionId = "normal") {
    const cookingDamage = global.DQ10CookingDamage;

    if (!cookingDamage) {
      return null;
    }

    if (isCookingLightActive(state, ingredient)) {
      const range = cookingDamage.getSpecialRange?.("light", conditionId);
      return range
        ? {
          range,
          values: cookingDamage.getSpecialValues?.("light", conditionId) || expandIntegerRange(range),
          sourceId: "light",
        }
        : null;
    }

    const positionId = ingredient?.optionId || "center";
    const distribution = cookingDamage.distributions?.[positionId]?.[conditionId];
    const range = cookingDamage.getRange?.(positionId, conditionId) ||
      (Array.isArray(distribution) && distribution.length > 0
        ? normalizeRange(Math.min(...distribution), Math.max(...distribution))
        : null);

    return range
      ? {
        range,
        values: distribution || expandIntegerRange(range),
        sourceId: positionId,
      }
      : null;
  }

  function resolveCriticalResult(current, criticalMin, criticalMax, targetMin, targetMax, targetMode) {
    const rawCriticalAfterMin = current + criticalMin;
    const rawCriticalAfterMax = current + criticalMax;

    if (targetMode !== "random-in-range") {
      const target = targetMin;
      const criticalStopApplies = current <= target && rawCriticalAfterMax >= target;
      const criticalAfterMin = criticalStopApplies && rawCriticalAfterMin >= target
        ? target
        : rawCriticalAfterMin;
      const criticalAfterMax = criticalStopApplies
        ? target
        : rawCriticalAfterMax;

      return {
        rawCriticalAfterMin,
        rawCriticalAfterMax,
        criticalAfterMin,
        criticalAfterMax,
        criticalStopApplies,
      };
    }

    const reachableTargetMin = Math.max(current, targetMin);
    const criticalStopApplies = current <= targetMax && rawCriticalAfterMax >= reachableTargetMin;
    let criticalAfterMin = rawCriticalAfterMin;
    let criticalAfterMax = rawCriticalAfterMax;

    if (criticalStopApplies) {
      criticalAfterMin = rawCriticalAfterMin >= reachableTargetMin
        ? reachableTargetMin
        : rawCriticalAfterMin;
      criticalAfterMax = current <= targetMin && rawCriticalAfterMax >= targetMax
        ? targetMax
        : rawCriticalAfterMax;
    }

    return {
      rawCriticalAfterMin,
      rawCriticalAfterMax,
      criticalAfterMin,
      criticalAfterMax,
      criticalStopApplies,
    };
  }

  function resolveTechnique(state, technique, ingredient) {
    if (technique.specialAction === "miracle-grill") {
      const target = resolveIngredientTarget(ingredient);
      const current = toNumber(ingredient?.current);
      const required = Math.max(0, target - current);

      return {
        ...technique,
        focusCost: 0,
        normalMin: required,
        normalMax: required,
        criticalMin: required,
        criticalMax: required,
        multiplier: 1,
      };
    }

    if (technique.damageModel === "cooking-fixed") {
      const conditionId = technique.conditionId || state.heat || "normal";
      const damageSource = resolveCookingDamageSource(state, ingredient, conditionId);
      const range = damageSource?.range;

      if (!range) {
        return technique;
      }

      const criticalMultiplier = toNumber(technique.criticalMultiplier, 2);

      return {
        ...technique,
        normalMin: range[0],
        normalMax: range[1],
        criticalMin: Math.ceil(range[0] * criticalMultiplier),
        criticalMax: Math.ceil(range[1] * criticalMultiplier),
      };
    }

    if (technique.damageModel === "smithing-temperature") {
      const smithingDamage = global.DQ10SmithingDamage;
      const temperature = state.heat || "1000";
      const range = smithingDamage?.ranges?.[temperature]?.[technique.powerId];

      if (!range) {
        return technique;
      }

      const criticalMultiplier = toNumber(technique.criticalMultiplier, smithingDamage.criticalMultiplier);

      return {
        ...technique,
        normalMin: range[0],
        normalMax: range[1],
        criticalMin: Math.ceil(range[0] * criticalMultiplier),
        criticalMax: Math.ceil(range[1] * criticalMultiplier),
      };
    }

    if (technique.damageModel === "sewing-power") {
      const sewingDamage = global.DQ10SewingDamage;
      const power = state.heat || "normal";
      const distribution = sewingDamage?.distributions?.[power]?.[technique.actionId];
      const range = sewingDamage?.getRange(power, technique.actionId);

      if (!range) {
        return technique;
      }

      const criticalMultiplier = toNumber(technique.criticalMultiplier, sewingDamage.criticalMultiplier);

      return {
        ...technique,
        distribution,
        normalMin: range[0],
        normalMax: range[1],
        criticalMin: Math.ceil(range[0] * criticalMultiplier),
        criticalMax: Math.ceil(range[1] * criticalMultiplier),
      };
    }

    if (technique.damageModel === "woodworking-grain") {
      const woodworkingDamage = global.DQ10WoodworkingDamage;
      const grain = ingredient?.optionId || state.heat || "parallel";
      const range = woodworkingDamage?.getRange(grain, technique.powerId);

      if (!range) {
        return technique;
      }

      const repeat = toNumber(technique.repeat, 1);
      const criticalMultiplier = toNumber(technique.criticalMultiplier, woodworkingDamage.criticalMultiplier);
      const normalMin = range[0] * repeat;
      const normalMax = range[1] * repeat;

      return {
        ...technique,
        distribution: woodworkingDamage.getDistribution(grain, technique.powerId),
        normalMin,
        normalMax,
        criticalMin: Math.ceil(normalMin * criticalMultiplier),
        criticalMax: Math.ceil(normalMax * criticalMultiplier),
      };
    }

    return technique;
  }

  function resolveIngredientTarget(ingredient) {
    const [successMin, successMax] = normalizeRange(ingredient?.successMin, ingredient?.successMax);
    return toNumber(ingredient?.target, Math.round((successMin + successMax) / 2));
  }

  function getCookingCriticalDamageValues(ingredient, state = {}) {
    const conditionId = state.heat || "normal";
    const damageSource = resolveCookingDamageSource(state, ingredient, conditionId);
    const values = damageSource?.values || [];

    return values.map((value) => Math.ceil(toNumber(value) * 2));
  }

  function resolveCriticalLockJudgement(ingredient, observedGain, state = {}) {
    if (observedGain <= 0) {
      return {
        lockJudgement: "true-critical",
        lockJudgementLabel: "本会心固定",
      };
    }

    const criticalValues = getCookingCriticalDamageValues(ingredient, state);
    const possibleFake = criticalValues.includes(observedGain);

    return possibleFake
      ? {
        lockJudgement: "possible-fake-critical",
        lockJudgementLabel: "偽会心の可能性あり",
      }
      : {
        lockJudgement: "true-critical",
        lockJudgementLabel: "本会心固定",
      };
  }

  function applyMiracleGrill(ingredient, state = {}) {
    const current = toNumber(ingredient.current);
    const target = resolveIngredientTarget(ingredient);
    const outcome = current > target ? "miss" : "hit";
    const after = outcome === "hit" ? target : current;
    const observedGain = after - current;
    const judgement = outcome === "hit"
      ? resolveCriticalLockJudgement(ingredient, observedGain, state)
      : { lockJudgement: "", lockJudgementLabel: "" };

    ingredient.current = after;
    ingredient.target = target;
    ingredient.locked = outcome === "hit";
    ingredient.lockJudgement = judgement.lockJudgement;
    ingredient.lockJudgementLabel = judgement.lockJudgementLabel;

    return {
      action: "miracle-grill",
      outcome,
      before: current,
      after,
      target,
      diff: target - after,
      observedGain,
      locked: ingredient.locked,
      ...judgement,
    };
  }

  function applyMiracleGrillToIngredients(ingredients, state = {}) {
    const results = ingredients.map((ingredient) => applyMiracleGrill(ingredient, state));
    const hasMiss = results.some((result) => result.outcome === "miss");

    return {
      action: "miracle-grill",
      outcome: hasMiss ? "partial" : "hit",
      results,
      hitCount: results.filter((result) => result.outcome === "hit").length,
      missCount: results.filter((result) => result.outcome === "miss").length,
    };
  }

  function analyzeIngredient(ingredient, technique, targetMode = "fixed") {
    const [successMin, successMax] = normalizeRange(ingredient.successMin, ingredient.successMax);
    const [normalMin, normalMax] = normalizeRange(technique.normalMin, technique.normalMax);
    const [criticalMin, criticalMax] = normalizeRange(technique.criticalMin, technique.criticalMax);
    const current = toNumber(ingredient.current);
    const target = targetMode === "random-in-range"
      ? resolveIngredientTarget(ingredient)
      : toNumber(ingredient.target, Math.round((successMin + successMax) / 2));

    if (ingredient.locked === true) {
      const inSuccessRange = current >= successMin && current <= successMax;
      const fakeCriticalLocked =
        ingredient.lockJudgement === "possible-fake-critical" ||
        ingredient.lockJudgement === "fake-critical-risk";
      const lockedStatus = fakeCriticalLocked
        ? "fake-critical-risk"
        : ingredient.lockJudgement === "true-critical"
          ? "locked-critical"
          : "locked";

      return {
        ...ingredient,
        current,
        target,
        successMin,
        successMax,
        lowerDiff: successMin - current,
        upperDiff: successMax - current,
        normalMin: 0,
        normalMax: 0,
        normalAfterMin: current,
        normalAfterMax: current,
        criticalMin: 0,
        criticalMax: 0,
        rawCriticalAfterMin: current,
        rawCriticalAfterMax: current,
        criticalAfterMin: current,
        criticalAfterMax: current,
        criticalStopApplies: true,
        normalHits: inSuccessRange,
        normalCanHit: inSuccessRange,
        guaranteedCritical: inSuccessRange,
        criticalCanHit: inSuccessRange,
        inTargetRangeUnlocked: false,
        criticalCanEnterTargetRangeBeforeGuarantee: false,
        possibleFakeCritical: fakeCriticalLocked,
        normalOver: false,
        criticalOver: current > successMax,
        currentOver: current > successMax,
        targetMode,
        status: lockedStatus,
        statusLabel: statusLabels[lockedStatus],
      };
    }

    const normalAfterMin = current + normalMin;
    const normalAfterMax = current + normalMax;
    const {
      rawCriticalAfterMin,
      rawCriticalAfterMax,
      criticalAfterMin,
      criticalAfterMax,
      criticalStopApplies,
    } = resolveCriticalResult(
      current,
      criticalMin,
      criticalMax,
      targetMode === "random-in-range" ? successMin : target,
      targetMode === "random-in-range" ? successMax : target,
      targetMode,
    );

    const lowerDiff = successMin - current;
    const upperDiff = successMax - current;
    const normalHits =
      normalAfterMin >= successMin && normalAfterMax <= successMax;
    const normalCanHit =
      normalAfterMax >= successMin && normalAfterMin <= successMax;
    const guaranteedCritical = targetMode === "random-in-range"
      ? current <= successMin && rawCriticalAfterMin >= successMax
      : criticalAfterMin >= successMin && criticalAfterMax <= successMax;
    const criticalCanHit =
      criticalAfterMax >= successMin && criticalAfterMin <= successMax;
    const partialTargetOver = targetMode === "random-in-range" && current > successMin && current <= successMax;
    const criticalOver = criticalAfterMax > successMax || partialTargetOver;
    const currentOver = current > successMax;
    const normalOver = normalAfterMax > successMax;
    const inTargetRangeUnlocked = current >= successMin && current <= successMax;
    const possibleFakeRangeMax = targetMode === "random-in-range"
      ? successMax
      : Math.min(successMax, target - 1);
    const criticalCanEnterTargetRangeBeforeGuarantee =
      !currentOver &&
      !guaranteedCritical &&
      possibleFakeRangeMax >= successMin &&
      rangesOverlap(rawCriticalAfterMin, rawCriticalAfterMax, successMin, possibleFakeRangeMax);
    const possibleFakeCritical =
      !currentOver &&
      !guaranteedCritical &&
      (inTargetRangeUnlocked || criticalCanEnterTargetRangeBeforeGuarantee);

    let status = "shortage";
    if (currentOver) {
      status = "over";
    } else if (guaranteedCritical) {
      status = "guaranteed";
    } else if (normalOver) {
      status = "normal-over-risk";
    } else if (possibleFakeCritical) {
      status = "fake-critical-risk";
    }

    return {
      ...ingredient,
      current,
      target,
      successMin,
      successMax,
      lowerDiff,
      upperDiff,
      normalMin,
      normalMax,
      normalAfterMin,
      normalAfterMax,
      criticalMin,
      criticalMax,
      rawCriticalAfterMin,
      rawCriticalAfterMax,
      criticalAfterMin,
      criticalAfterMax,
      criticalStopApplies,
      normalHits,
      normalCanHit,
      guaranteedCritical,
      criticalCanHit,
      inTargetRangeUnlocked,
      criticalCanEnterTargetRangeBeforeGuarantee,
      possibleFakeCritical,
      normalOver,
      criticalOver,
      currentOver,
      targetMode,
      status,
      statusLabel: statusLabels[status],
    };
  }

  function analyzeIngredientAcrossTechniques(state, ingredient) {
    const techniqueAnalyses = state.techniques.map((technique) => {
      const resolvedTechnique = resolveTechnique(state, technique, ingredient);
      return {
        ...analyzeIngredient(ingredient, resolvedTechnique, state.targetMode),
        technique: resolvedTechnique,
      };
    });
    const representative = [...techniqueAnalyses].sort((a, b) =>
      statusRanks[b.status] - statusRanks[a.status],
    )[0];

    return {
      ...representative,
      techniqueAnalyses,
    };
  }

  function analyzeState(state) {
    const ingredients = state.ingredients.map((ingredient) =>
      analyzeIngredientAcrossTechniques(state, ingredient),
    );

    return {
      ingredients,
      guaranteedCount: ingredients.filter((item) =>
        item.techniqueAnalyses.some((analysis) => analysis.guaranteedCritical),
      ).length,
      warningCount: ingredients.filter((item) =>
        item.techniqueAnalyses.some((analysis) => analysis.status === "normal-over-risk"),
      ).length,
      dangerCount: ingredients.filter((item) =>
        item.techniqueAnalyses.every((analysis) => analysis.status === "shortage"),
      ).length,
    };
  }

  function evaluateTechnique(state, technique) {
    const ingredients = state.ingredients;
    const focus = state.focus;
    const resolvedTechnique = resolveTechnique(state, technique, ingredients[0]);
    const analysis = ingredients.map((ingredient) =>
      analyzeIngredient(ingredient, resolveTechnique(state, technique, ingredient), state.targetMode),
    );
    const affordable = toNumber(focus) >= toNumber(resolvedTechnique.focusCost);
    const scoring = {
      guaranteed: 35,
      criticalCandidate: 16,
      normalHit: 14,
      normalCandidate: 7,
      warningPenalty: 12,
      dangerPenalty: 8,
      overPenalty: 24,
      focusCostPenalty: 0.2,
      ...(resolvedTechnique.scoring || {}),
    };
    let score = affordable ? 0 : -100;

    analysis.forEach((item) => {
      if (item.guaranteedCritical) {
        score += scoring.guaranteed * toNumber(resolvedTechnique.criticalWeight, 1);
      } else if (item.criticalCanHit && !item.criticalOver) {
        score += scoring.criticalCandidate * toNumber(resolvedTechnique.criticalWeight, 1);
      } else if (item.normalHits) {
        score += scoring.normalHit;
      } else if (item.normalCanHit) {
        score += scoring.normalCandidate;
      }

      if (item.status === "normal-over-risk") {
        score -= scoring.warningPenalty;
      }

      if (item.status === "shortage") {
        score -= scoring.dangerPenalty;
      }

      if (item.status === "over") {
        score -= scoring.overPenalty;
      }
    });

    score -= Math.max(0, toNumber(resolvedTechnique.focusCost) - 4) * scoring.focusCostPenalty;

    const reasonParts = [];
    const guaranteed = analysis.filter((item) => item.guaranteedCritical).length;
    const warnings = analysis.filter((item) => item.status === "normal-over-risk").length;
    const fakeCritical = analysis.filter((item) => item.status === "fake-critical-risk").length;

    if (!affordable) {
      reasonParts.push("集中力不足");
    }
    if (guaranteed > 0) {
      reasonParts.push(`会心時確定 ${guaranteed} 件`);
    }
    if (fakeCritical > 0) {
      reasonParts.push(`偽会心の可能性 ${fakeCritical} 件`);
    }
    if (warnings > 0) {
      reasonParts.push(`通常時超過リスク ${warnings} 件`);
    }
    if (reasonParts.length === 0) {
      reasonParts.push("成功範囲への寄せやすさを優先");
    }

    return {
      technique: resolvedTechnique,
      score,
      affordable,
      reason: reasonParts.join(" / "),
    };
  }

  function recommendTechniques(state, limit = 3) {
    return state.techniques
      .map((technique) => evaluateTechnique(state, technique))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  global.DQ10CraftEngine = {
    statusLabels,
    resolveTechnique,
    resolveIngredientTarget,
    resolveCriticalLockJudgement,
    applyMiracleGrill,
    applyMiracleGrillToIngredients,
    analyzeIngredient,
    analyzeIngredientAcrossTechniques,
    analyzeState,
    recommendTechniques,
  };
  global.CookingEngine = global.DQ10CraftEngine;

  if (typeof module !== "undefined") {
    module.exports = global.DQ10CraftEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);
