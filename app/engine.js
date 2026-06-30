(function (global) {
  const statusLabels = {
    stable: "安全",
    aim: "会心狙い",
    guaranteed: "確定会心",
    warning: "超過注意",
    danger: "危険",
    over: "超過",
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

  function resolveTechnique(state, technique, ingredient) {
    if (technique.damageModel === "cooking-fixed") {
      const cookingDamage = global.DQ10CookingDamage;
      const positionId = ingredient?.optionId || "center";
      const conditionId = technique.conditionId || state.heat || "normal";
      const range = cookingDamage?.getRange(positionId, conditionId);

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

  function analyzeIngredient(ingredient, technique) {
    const [successMin, successMax] = normalizeRange(ingredient.successMin, ingredient.successMax);
    const [normalMin, normalMax] = normalizeRange(technique.normalMin, technique.normalMax);
    const [criticalMin, criticalMax] = normalizeRange(technique.criticalMin, technique.criticalMax);
    const current = toNumber(ingredient.current);
    const target = toNumber(ingredient.target, Math.round((successMin + successMax) / 2));

    const normalAfterMin = current + normalMin;
    const normalAfterMax = current + normalMax;
    const rawCriticalAfterMin = current + criticalMin;
    const rawCriticalAfterMax = current + criticalMax;
    const criticalStopApplies = current <= target && rawCriticalAfterMax >= target;
    const criticalAfterMin = criticalStopApplies && rawCriticalAfterMin >= target
      ? target
      : rawCriticalAfterMin;
    const criticalAfterMax = criticalStopApplies
      ? target
      : rawCriticalAfterMax;

    const lowerDiff = successMin - current;
    const upperDiff = successMax - current;
    const normalHits =
      normalAfterMin >= successMin && normalAfterMax <= successMax;
    const normalCanHit =
      normalAfterMax >= successMin && normalAfterMin <= successMax;
    const guaranteedCritical =
      criticalAfterMin >= successMin && criticalAfterMax <= successMax;
    const criticalCanHit =
      criticalAfterMax >= successMin && criticalAfterMin <= successMax;
    const criticalOver = criticalAfterMax > successMax;
    const currentOver = current > successMax;
    const closeToUpper = upperDiff >= 0 && upperDiff < normalMin;

    let status = "danger";
    if (currentOver) {
      status = "over";
    } else if (guaranteedCritical) {
      status = "guaranteed";
    } else if (criticalOver && upperDiff <= criticalMax) {
      status = "warning";
    } else if (criticalCanHit) {
      status = "aim";
    } else if (normalHits || normalCanHit) {
      status = closeToUpper ? "warning" : "stable";
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
      criticalOver,
      currentOver,
      status,
      statusLabel: statusLabels[status],
    };
  }

  function analyzeState(state) {
    const selectedTechnique =
      state.techniques.find((candidate) => candidate.id === state.selectedTechniqueId) ||
      state.techniques[0];
    const ingredients = state.ingredients.map((ingredient) =>
      analyzeIngredient(ingredient, resolveTechnique(state, selectedTechnique, ingredient)),
    );

    return {
      technique: resolveTechnique(state, selectedTechnique, state.ingredients[0]),
      ingredients,
      guaranteedCount: ingredients.filter((item) => item.guaranteedCritical).length,
      warningCount: ingredients.filter((item) => item.status === "warning" || item.status === "over").length,
      dangerCount: ingredients.filter((item) => item.status === "danger").length,
    };
  }

  function evaluateTechnique(state, technique) {
    const ingredients = state.ingredients;
    const focus = state.focus;
    const resolvedTechnique = resolveTechnique(state, technique, ingredients[0]);
    const analysis = ingredients.map((ingredient) =>
      analyzeIngredient(ingredient, resolveTechnique(state, technique, ingredient)),
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

      if (item.status === "warning") {
        score -= scoring.warningPenalty;
      }

      if (item.status === "danger") {
        score -= scoring.dangerPenalty;
      }

      if (item.status === "over") {
        score -= scoring.overPenalty;
      }
    });

    score -= Math.max(0, toNumber(resolvedTechnique.focusCost) - 4) * scoring.focusCostPenalty;

    const reasonParts = [];
    const guaranteed = analysis.filter((item) => item.guaranteedCritical).length;
    const warnings = analysis.filter((item) => item.status === "warning" || item.status === "over").length;
    const aim = analysis.filter((item) => item.status === "aim").length;

    if (!affordable) {
      reasonParts.push("集中力不足");
    }
    if (guaranteed > 0) {
      reasonParts.push(`確定会心候補 ${guaranteed} 件`);
    }
    if (aim > 0) {
      reasonParts.push(`会心狙い ${aim} 件`);
    }
    if (warnings > 0) {
      reasonParts.push(`超過リスク ${warnings} 件`);
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
    analyzeIngredient,
    analyzeState,
    recommendTechniques,
  };
  global.CookingEngine = global.DQ10CraftEngine;

  if (typeof module !== "undefined") {
    module.exports = global.DQ10CraftEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);
