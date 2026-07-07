(function (global) {
  const statusLabels = {
    locked: "固定",
    "locked-critical": "本会心固定",
    guaranteed: "会心時確定",
    "gauge-entry": "ゲージ突入",
    "normal-over-risk": "通常時超過の可能性あり",
    over: "超過中",
    "fake-critical-risk": "偽会心の可能性あり",
    "in-range": "基準内",
    shortage: "不足",
  };
  const statusRanks = {
    "locked-critical": 7,
    locked: 6,
    over: 5,
    guaranteed: 4,
    "normal-over-risk": 3,
    "gauge-entry": 2.5,
    "fake-critical-risk": 2,
    "in-range": 1.5,
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

  function isSmithingCraftState(state = {}) {
    return ["weapon-smithing", "armor-smithing", "tool-smithing"].includes(state.craftType);
  }

  function isSmithingLightActive(state = {}, ingredient = {}) {
    const heat = toNumber(state.heat, NaN);
    return isSmithingCraftState(state) &&
      state.traitId === "light" &&
      ingredient.isGlowing === true &&
      Number.isFinite(heat) &&
      heat % 200 === 0;
  }

  function getSmithingHeatPhase(state = {}) {
    const heat = toNumber(state.heat, NaN);
    if (!isSmithingCraftState(state) || !Number.isFinite(heat) || heat % 200 !== 0) {
      return "none";
    }

    return heat % 400 === 0 ? "high" : "low";
  }

  function getSmithingPowerMultiplier(state = {}, ingredient = {}) {
    if (isSmithingLightActive(state, ingredient)) {
      return 2;
    }

    if (state.traitId !== "double-half") {
      return 1;
    }

    const phase = getSmithingHeatPhase(state);
    if (phase === "high") {
      return 2;
    }
    if (phase === "low") {
      return 0.5;
    }

    return 1;
  }

  function isSmithingHephaestusActive(state = {}) {
    return isSmithingCraftState(state) && state.specialChargeState === "using";
  }

  function shouldPreventHephaestusDamage(state = {}, ingredient = {}) {
    if (!isSmithingHephaestusActive(state)) {
      return false;
    }

    const current = toNumber(ingredient?.current);
    const target = resolveIngredientTarget(ingredient);

    return current >= target;
  }

  function getSmithingFocusCostMultiplier(state = {}) {
    if (state.traitId !== "focus-change") {
      return 1;
    }

    const phase = getSmithingHeatPhase(state);
    if (phase === "high") {
      return 0.5;
    }
    if (phase === "low") {
      return 1.5;
    }

    return 1;
  }

  function isSmithingReturnNextTurn(state = {}) {
    const heat = toNumber(state.heat, NaN);
    return isSmithingCraftState(state) &&
      state.traitId === "return" &&
      Number.isFinite(heat) &&
      heat % 200 === 50;
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

  function normalizeCookingBlockEffect(value) {
    return global.DQ10CookingEffects?.normalizeCookingBlockEffect?.(value) ||
      (value === "half-seal" || value === "full-seal" ? value : "none");
  }

  function hasCookingCellEffect(state = {}, ingredient = {}, effectId) {
    const row = toNumber(ingredient?.gridCell?.row, NaN);
    const column = toNumber(ingredient?.gridCell?.column, NaN);

    if (!Number.isFinite(row) || !Number.isFinite(column)) {
      return false;
    }

    return Array.isArray(state.cookingCellEffects) &&
      state.cookingCellEffects.some((entry) =>
        toNumber(entry?.row, NaN) === row &&
        toNumber(entry?.column, NaN) === column &&
        entry?.effectId === effectId,
      );
  }

  function halveDamageRange(range) {
    return [
      Math.ceil(toNumber(range[0]) / 2),
      Math.ceil(toNumber(range[1]) / 2),
    ];
  }

  function invertDamageRange(range) {
    return [
      -toNumber(range[1]),
      -toNumber(range[0]),
    ];
  }

  function applyCookingDamageEffects(state = {}, ingredient = {}, range) {
    const blockEffect = normalizeCookingBlockEffect(ingredient?.cookingBlockEffect);

    if (blockEffect === "full-seal") {
      return [0, 0];
    }

    if (hasCookingCellEffect(state, ingredient, "heat-return")) {
      return invertDamageRange(range);
    }

    if (blockEffect === "half-seal") {
      return halveDamageRange(range);
    }

    return range;
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
      const normalRange = applyCookingDamageEffects(state, ingredient, range);
      const criticalRange = applyCookingDamageEffects(state, ingredient, [
        Math.ceil(range[0] * criticalMultiplier),
        Math.ceil(range[1] * criticalMultiplier),
      ]);

      return {
        ...technique,
        normalMin: normalRange[0],
        normalMax: normalRange[1],
        criticalMin: criticalRange[0],
        criticalMax: criticalRange[1],
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
      const smithingPowerMultiplier = getSmithingPowerMultiplier(state, ingredient);
      const focusCostMultiplier = getSmithingFocusCostMultiplier(state);
      const criticalRateBoost = state.traitId === "focus-change" && getSmithingHeatPhase(state) === "low";
      const hephaestusActive = isSmithingHephaestusActive(state);
      const normalMin = Math.ceil(range[0] * smithingPowerMultiplier);
      const normalMax = Math.ceil(range[1] * smithingPowerMultiplier);
      const criticalMin = Math.ceil(normalMin * criticalMultiplier);
      const criticalMax = Math.ceil(normalMax * criticalMultiplier);
      const hephaestusNoDamage = shouldPreventHephaestusDamage(state, ingredient);
      const actualMin = hephaestusNoDamage ? 0 : hephaestusActive ? criticalMin : normalMin;
      const actualMax = hephaestusNoDamage ? 0 : hephaestusActive ? criticalMax : normalMax;

      return {
        ...technique,
        focusCost: Math.ceil(toNumber(technique.focusCost, 0) * focusCostMultiplier),
        criticalWeight: toNumber(technique.criticalWeight, 1) * (criticalRateBoost ? 1.5 : 1),
        criticalRateBoost,
        hephaestusActive,
        hephaestusNoDamage,
        forcedCritical: hephaestusActive,
        normalMin: actualMin,
        normalMax: actualMax,
        criticalMin: hephaestusNoDamage ? 0 : criticalMin,
        criticalMax: hephaestusNoDamage ? 0 : criticalMax,
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
    const targetDiff = target - current;

    if (ingredient.locked === true) {
      const inSuccessRange = current >= successMin && current <= successMax;
      const lockedStatus = ingredient.lockJudgement === "true-critical"
        ? "locked-critical"
        : "locked";

      return {
        ...ingredient,
        current,
        target,
        successMin,
        successMax,
        targetDiff,
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
        guaranteedCritical: false,
        criticalCanHit: inSuccessRange,
        inTargetRangeUnlocked: false,
        criticalCanEnterTargetRangeBeforeGuarantee: false,
        possibleFakeCritical: false,
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
    const forcedCritical = technique.forcedCritical === true;

    const lowerDiff = successMin - current;
    const upperDiff = successMax - current;
    if (forcedCritical) {
      const currentToTarget = target - current;
      const hephaestusStopsAtTarget = technique.hephaestusActive === true && currentToTarget > 0 && rawCriticalAfterMax >= target;
      const hephaestusAfterMin = hephaestusStopsAtTarget && rawCriticalAfterMin >= target
        ? target
        : criticalAfterMin;
      const hephaestusAfterMax = hephaestusStopsAtTarget
        ? target
        : criticalAfterMax;
      const forcedMin = Math.max(0, hephaestusAfterMin - current);
      const forcedMax = Math.max(0, hephaestusAfterMax - current);
      const currentOver = current > successMax;
      const shortage = !currentOver && hephaestusAfterMax < successMin;
      const inTargetRangeUnlocked = current >= successMin && current <= successMax;
      const criticalCanHit = hephaestusAfterMax >= successMin && hephaestusAfterMin <= successMax;
      const guaranteedCritical =
        !currentOver &&
        !shortage &&
        !inTargetRangeUnlocked &&
        current + criticalMin >= successMax;
      const possibleFakeCritical =
        !currentOver &&
        !shortage &&
        !inTargetRangeUnlocked &&
        !guaranteedCritical &&
        criticalCanHit;
      let status = "in-range";

      if (currentOver) {
        status = "over";
      } else if (shortage) {
        status = "shortage";
      } else if (guaranteedCritical) {
        status = "guaranteed";
      } else if (possibleFakeCritical) {
        status = "fake-critical-risk";
      }

      return {
        ...ingredient,
        current,
        target,
        successMin,
        successMax,
        targetDiff,
        lowerDiff,
        upperDiff,
        forcedCritical,
        hephaestusActive: technique.hephaestusActive === true,
        hephaestusNoDamage: technique.hephaestusNoDamage === true,
        normalMin: forcedMin,
        normalMax: forcedMax,
        normalAfterMin: hephaestusAfterMin,
        normalAfterMax: hephaestusAfterMax,
        criticalMin,
        criticalMax,
        rawCriticalAfterMin,
        rawCriticalAfterMax,
        criticalAfterMin: hephaestusAfterMin,
        criticalAfterMax: hephaestusAfterMax,
        criticalStopApplies: criticalStopApplies || hephaestusStopsAtTarget,
        normalHits: criticalCanHit,
        normalCanHit: criticalCanHit,
        normalMaxCanEnterTargetRange: current < successMin && hephaestusAfterMax >= successMin && hephaestusAfterMax <= successMax,
        guaranteedCritical,
        criticalCanHit,
        inTargetRangeUnlocked,
        criticalCanEnterTargetRangeBeforeGuarantee: false,
        possibleFakeCritical,
        normalOver: false,
        criticalOver: currentOver,
        currentOver,
        targetMode,
        status,
        statusLabel: statusLabels[status],
      };
    }

    const criticalCanReachTarget = current < successMin && current + criticalMax >= successMin;
    const normalHits =
      normalAfterMin >= successMin && normalAfterMax <= successMax;
    const normalCanHit =
      normalAfterMax >= successMin && normalAfterMin <= successMax;
    const normalMaxCanEnterTargetRange =
      current < successMin &&
      normalAfterMax >= successMin &&
      normalAfterMax <= successMax;
    const currentOver = current > successMax;
    const shortage = !currentOver && current + criticalMax < successMin;
    const normalOver = !currentOver && !shortage && normalAfterMax > successMax;
    const guaranteedCritical =
      !currentOver &&
      !shortage &&
      !normalOver &&
      current < successMin &&
      current + criticalMin >= successMin;
    const criticalCanHit =
      criticalAfterMax >= successMin && criticalAfterMin <= successMax;
    const criticalOver = currentOver;
    const inTargetRangeUnlocked = current >= successMin && current <= successMax;
    const criticalCanEnterTargetRangeBeforeGuarantee =
      !currentOver &&
      !shortage &&
      !normalOver &&
      !guaranteedCritical &&
      current < successMin &&
      current + criticalMin < successMin &&
      criticalCanReachTarget;
    const possibleFakeCritical =
      !currentOver &&
      !shortage &&
      !normalOver &&
      !guaranteedCritical &&
      criticalCanEnterTargetRangeBeforeGuarantee;

    let status = "in-range";
    if (currentOver) {
      status = "over";
    } else if (shortage) {
      status = "shortage";
    } else if (normalOver) {
      status = "normal-over-risk";
    } else if (guaranteedCritical) {
      status = "guaranteed";
    } else if (possibleFakeCritical) {
      status = "fake-critical-risk";
    }

    return {
      ...ingredient,
      current,
      target,
      successMin,
      successMax,
      targetDiff,
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
      normalMaxCanEnterTargetRange,
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
    const isSmithingCraft = isSmithingCraftState(state);
    const normalizedIngredient = isSmithingCraft
      ? { ...ingredient, lockJudgement: "", lockJudgementLabel: "" }
      : ingredient;
    const analysisTechniques = isSmithingCraft
      ? [{
        id: "board-normal",
        name: "BOARD判定(1倍)",
        damageModel: "smithing-temperature",
        powerId: "normal",
        criticalMultiplier: global.DQ10SmithingDamage?.criticalMultiplier || 2,
        includeInAnalysis: true,
      }]
      : state.techniques.filter((technique) => technique.includeInAnalysis !== false);
    const techniqueAnalyses = analysisTechniques.map((technique) => {
      const resolvedTechnique = resolveTechnique(state, technique, normalizedIngredient);
      const analysis = analyzeIngredient(normalizedIngredient, resolvedTechnique, state.targetMode);
      const smithingStatus = isSmithingCraft && analysis.forcedCritical !== true && analysis.normalMaxCanEnterTargetRange
        ? "gauge-entry"
        : analysis.status;
      return {
        ...analysis,
        status: smithingStatus,
        statusLabel: isSmithingCraft && smithingStatus === "locked"
          ? "確定済み"
          : isSmithingCraft && smithingStatus === "guaranteed"
            ? "本会心！"
            : statusLabels[smithingStatus],
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
      reasonParts.push(isSmithingCraftState(state)
        ? `本会心！ ${guaranteed} 件`
        : `会心時確定 ${guaranteed} 件`);
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
      .filter((technique) => technique.recommendable !== false)
      .map((technique) => evaluateTechnique(state, technique))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  global.DQ10CraftEngine = {
    statusLabels,
    resolveTechnique,
    isSmithingReturnNextTurn,
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
