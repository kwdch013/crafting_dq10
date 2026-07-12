(function (global) {
  // 参照表の各欄は左から同確率の抽選候補であり、同じ値だけweightへ集約します。
  function createWeightedDistribution(candidates) {
    const counts = new Map();
    candidates.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()].map(([value, weight]) => ({ value, weight }));
  }

  function createDistributionSet(candidateSet) {
    return Object.fromEntries(
      Object.entries(candidateSet).map(([grainId, powers]) => [
        grainId,
        Object.fromEntries(
          Object.entries(powers).map(([powerId, candidates]) => [powerId, createWeightedDistribution(candidates)]),
        ),
      ]),
    );
  }

  const distributions = createDistributionSet({
    parallel: {
      power_0_8: [10, 11, 12, 13, 13, 14, 15],
      normal: [12, 13, 14, 15, 16, 17, 18],
      power_1_1: [14, 15, 16, 17, 18, 19, 20],
      power_1_4: [17, 19, 20, 21, 23, 24, 26],
      power_2_0: [24, 26, 28, 30, 32, 34, 36],
      power_3_0: [36, 39, 42, 45, 48, 51, 54],
      plane: [5, 6, 7, 8],
    },
    vertical: {
      power_0_8: [5, 6, 6, 7, 7, 7, 8],
      normal: [6, 7, 7, 8, 8, 9, 9],
      power_1_1: [7, 8, 8, 9, 9, 10, 10],
      power_1_4: [9, 10, 10, 11, 12, 12, 13],
      power_2_0: [12, 13, 14, 15, 16, 17, 18],
      power_3_0: [18, 20, 21, 23, 24, 26, 27],
      plane: [3, 4],
    },
  });

  const wedgedDistributions = createDistributionSet({
    parallel: {
      power_0_8: [17, 18, 20, 21, 21, 23, 25],
      normal: [20, 21, 23, 25, 26, 28, 29],
      power_1_1: [23, 25, 26, 28, 29, 31, 33],
      power_1_4: [28, 31, 33, 34, 37, 39, 42],
      power_2_0: [39, 42, 45, 49, 52, 55, 58],
      power_3_0: [58, 63, 68, 73, 77, 82, 87],
      plane: [9, 10, 12, 13],
    },
    vertical: {
      power_0_8: [9, 9, 10, 11, 11, 12, 13],
      normal: [10, 11, 12, 13, 13, 14, 15],
      power_1_1: [12, 13, 13, 14, 15, 16, 17],
      power_1_4: [14, 16, 17, 17, 19, 20, 21],
      power_2_0: [20, 21, 23, 25, 26, 28, 29],
      power_3_0: [29, 32, 34, 37, 39, 41, 44],
      plane: [5, 5, 6, 7],
    },
  });

  const powers = {
    plane: { label: "カンナ", multiplier: 0.4 },
    power_0_8: { label: "0.8倍", multiplier: 0.8 },
    normal: { label: "1倍", multiplier: 1 },
    power_1_1: { label: "1.1倍", multiplier: 1.1 },
    power_1_4: { label: "1.4倍", multiplier: 1.4 },
    power_2_0: { label: "2倍", multiplier: 2 },
    power_3_0: { label: "3倍", multiplier: 3 },
  };

  function withPercent(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    return items.map((item) => ({
      value: item.value,
      percent: Math.round((item.weight / total) * 1000) / 10,
    }));
  }

  // レシピの木目は横/縦で保持し、ダメージ表の順目/逆目へ解決します。
  function normalizeGrainId(grainId) {
    const aliases = {
      horizontal: "parallel",
      vertical: "vertical",
      parallel: "parallel",
    };

    return aliases[grainId] || "parallel";
  }

  function resolveDistribution(grainId, powerId, options = {}) {
    const table = options.wedged === true ? wedgedDistributions : distributions;
    return table[normalizeGrainId(grainId)]?.[powerId] || null;
  }

  function getDistribution(grainId, powerId, options = {}) {
    const values = resolveDistribution(grainId, powerId, options);
    return values ? withPercent(values) : null;
  }

  function getRange(grainId, powerId, options = {}) {
    const values = resolveDistribution(grainId, powerId, options);
    if (!values) {
      return null;
    }

    const nums = values.map((item) => item.value);
    return [Math.min(...nums), Math.max(...nums)];
  }

  global.DQ10WoodworkingDamage = {
    source: "refarence/woodworking/木工ダメージ.png",
    criticalMultiplier: 2,
    powers,
    distributions,
    wedgedDistributions,
    getDistribution,
    getRange,
    normalizeGrainId,
    grainStates: [
      { id: "horizontal", label: "横" },
      { id: "vertical", label: "縦" },
    ],
  };
})(window);
