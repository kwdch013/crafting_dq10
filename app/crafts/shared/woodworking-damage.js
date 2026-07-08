(function (global) {
  const distributions = {
    parallel: {
      power_1_4: [{ value: 17, weight: 1 }, { value: 19, weight: 1 }, { value: 20, weight: 1 }, { value: 21, weight: 1 }, { value: 23, weight: 1 }, { value: 24, weight: 1 }, { value: 26, weight: 1 }],
      power_1_1: [{ value: 14, weight: 1 }, { value: 15, weight: 1 }, { value: 16, weight: 1 }, { value: 17, weight: 1 }, { value: 18, weight: 1 }, { value: 19, weight: 1 }, { value: 20, weight: 1 }],
      normal: [{ value: 12, weight: 1 }, { value: 13, weight: 1 }, { value: 14, weight: 1 }, { value: 15, weight: 1 }, { value: 16, weight: 1 }, { value: 17, weight: 1 }, { value: 18, weight: 1 }],
      power_0_8: [{ value: 10, weight: 1 }, { value: 11, weight: 1 }, { value: 12, weight: 1 }, { value: 13, weight: 2 }, { value: 14, weight: 1 }, { value: 15, weight: 1 }],
      plane: [{ value: 5, weight: 1 }, { value: 6, weight: 1 }, { value: 7, weight: 1 }, { value: 8, weight: 1 }],
    },
    vertical: {
      power_1_4: [{ value: 9, weight: 1 }, { value: 10, weight: 2 }, { value: 11, weight: 1 }, { value: 12, weight: 2 }, { value: 13, weight: 1 }],
      power_1_1: [{ value: 7, weight: 1 }, { value: 8, weight: 2 }, { value: 9, weight: 2 }, { value: 10, weight: 2 }],
      normal: [{ value: 6, weight: 1 }, { value: 7, weight: 2 }, { value: 8, weight: 2 }, { value: 9, weight: 2 }],
      power_0_8: [{ value: 5, weight: 1 }, { value: 6, weight: 2 }, { value: 7, weight: 3 }, { value: 8, weight: 1 }],
      plane: [{ value: 3, weight: 1 }, { value: 4, weight: 1 }],
    },
  };

  const powers = {
    power_1_4: { label: "1.4倍", multiplier: 1.4 },
    power_1_1: { label: "1.1倍", multiplier: 1.1 },
    normal: { label: "1倍", multiplier: 1 },
    power_0_8: { label: "0.8倍", multiplier: 0.8 },
    plane: { label: "カンナ", multiplier: 0.4 },
  };

  function withPercent(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    return items.map((item) => ({
      value: item.value,
      percent: Math.round((item.weight / total) * 1000) / 10,
    }));
  }

  // レシピの木目は横/縦で保持し、既存の順目/逆目ダメージ表へ解決します。
  function normalizeGrainId(grainId) {
    const aliases = {
      horizontal: "parallel",
      vertical: "vertical",
      parallel: "parallel",
    };

    return aliases[grainId] || "parallel";
  }

  function getDistribution(grainId, powerId) {
    const values = distributions[normalizeGrainId(grainId)]?.[powerId];
    return values ? withPercent(values) : null;
  }

  function getRange(grainId, powerId) {
    const values = distributions[normalizeGrainId(grainId)]?.[powerId];

    if (!values) {
      return null;
    }

    const nums = values.map((item) => item.value);
    return [Math.min(...nums), Math.max(...nums)];
  }

  global.DQ10WoodworkingDamage = {
    source: "https://xn--10-yg4a1a3kyh.jp/dq10_artisan4.html",
    criticalMultiplier: 2,
    powers,
    distributions,
    getDistribution,
    getRange,
    normalizeGrainId,
    grainStates: [
      { id: "horizontal", label: "横" },
      { id: "vertical", label: "縦" },
    ],
  };
})(window);
