(function (global) {
  const distributions = {
    weak: {
      sew: [{ value: 6, percent: 14.3 }, { value: 7, percent: 28.6 }, { value: 8, percent: 28.6 }, { value: 9, percent: 28.6 }],
      half: [{ value: 3, percent: 14.3 }, { value: 4, percent: 57.1 }, { value: 5, percent: 28.6 }],
      double: [{ value: 12, percent: 14.3 }, { value: 13, percent: 14.3 }, { value: 14, percent: 14.3 }, { value: 15, percent: 14.3 }, { value: 16, percent: 14.3 }, { value: 17, percent: 14.3 }, { value: 18, percent: 14.3 }],
      triple: [{ value: 18, percent: 14.3 }, { value: 20, percent: 14.3 }, { value: 21, percent: 14.3 }, { value: 23, percent: 14.3 }, { value: 24, percent: 14.3 }, { value: 26, percent: 14.3 }, { value: 27, percent: 14.3 }],
      loosen: [{ value: -3, percent: 57.1 }, { value: -4, percent: 42.9 }],
      wind_center: [{ value: 9, percent: 14.3 }, { value: 10, percent: 14.3 }, { value: 11, percent: 14.3 }, { value: 12, percent: 28.6 }, { value: 13, percent: 14.3 }, { value: 14, percent: 14.3 }],
      wind_around: [{ value: 5, percent: 28.6 }, { value: 6, percent: 42.9 }, { value: 7, percent: 28.6 }],
    },
    normal: {
      sew: [{ value: 12, percent: 14.3 }, { value: 13, percent: 14.3 }, { value: 14, percent: 14.3 }, { value: 15, percent: 14.3 }, { value: 16, percent: 14.3 }, { value: 17, percent: 14.3 }, { value: 18, percent: 14.3 }],
      half: [{ value: 6, percent: 14.3 }, { value: 7, percent: 28.6 }, { value: 8, percent: 28.6 }, { value: 9, percent: 28.6 }],
      double: [{ value: 24, percent: 14.3 }, { value: 26, percent: 14.3 }, { value: 28, percent: 14.3 }, { value: 30, percent: 14.3 }, { value: 32, percent: 14.3 }, { value: 34, percent: 14.3 }, { value: 36, percent: 14.3 }],
      triple: [{ value: 36, percent: 14.3 }, { value: 39, percent: 14.3 }, { value: 42, percent: 14.3 }, { value: 45, percent: 14.3 }, { value: 48, percent: 14.3 }, { value: 51, percent: 14.3 }, { value: 54, percent: 14.3 }],
      loosen: [{ value: -6, percent: 28.6 }, { value: -7, percent: 28.6 }, { value: -8, percent: 28.6 }, { value: -9, percent: 14.3 }],
      wind_center: [{ value: 18, percent: 14.3 }, { value: 20, percent: 14.3 }, { value: 21, percent: 14.3 }, { value: 23, percent: 14.3 }, { value: 24, percent: 14.3 }, { value: 26, percent: 14.3 }, { value: 27, percent: 14.3 }],
      wind_around: [{ value: 9, percent: 14.3 }, { value: 10, percent: 14.3 }, { value: 11, percent: 14.3 }, { value: 12, percent: 28.6 }, { value: 13, percent: 14.3 }, { value: 14, percent: 14.3 }],
    },
    strong: {
      sew: [{ value: 18, percent: 14.3 }, { value: 20, percent: 14.3 }, { value: 21, percent: 14.3 }, { value: 23, percent: 14.3 }, { value: 24, percent: 14.3 }, { value: 26, percent: 14.3 }, { value: 27, percent: 14.3 }],
      half: [{ value: 9, percent: 14.3 }, { value: 11, percent: 28.6 }, { value: 12, percent: 28.6 }, { value: 14, percent: 28.6 }],
      double: [{ value: 36, percent: 14.3 }, { value: 39, percent: 14.3 }, { value: 42, percent: 14.3 }, { value: 45, percent: 14.3 }, { value: 48, percent: 14.3 }, { value: 51, percent: 14.3 }, { value: 54, percent: 14.3 }],
      triple: [{ value: 54, percent: 14.3 }, { value: 59, percent: 14.3 }, { value: 63, percent: 14.3 }, { value: 68, percent: 14.3 }, { value: 72, percent: 14.3 }, { value: 77, percent: 14.3 }, { value: 81, percent: 14.3 }],
      loosen: [{ value: -9, percent: 28.6 }, { value: -10, percent: 28.6 }, { value: -12, percent: 28.6 }, { value: -13, percent: 14.3 }],
      wind_center: [{ value: 27, percent: 14.3 }, { value: 30, percent: 14.3 }, { value: 32, percent: 14.3 }, { value: 35, percent: 14.3 }, { value: 36, percent: 14.3 }, { value: 39, percent: 14.3 }, { value: 41, percent: 14.3 }],
      wind_around: [{ value: 14, percent: 14.3 }, { value: 15, percent: 14.3 }, { value: 17, percent: 14.3 }, { value: 18, percent: 28.6 }, { value: 20, percent: 14.3 }, { value: 21, percent: 14.3 }],
    },
    strongest: {
      sew: [{ value: 24, percent: 14.3 }, { value: 26, percent: 14.3 }, { value: 28, percent: 14.3 }, { value: 30, percent: 14.3 }, { value: 32, percent: 14.3 }, { value: 34, percent: 14.3 }, { value: 36, percent: 14.3 }],
      half: [{ value: 12, percent: 14.3 }, { value: 14, percent: 28.6 }, { value: 16, percent: 28.6 }, { value: 18, percent: 28.6 }],
      double: [{ value: 48, percent: 14.3 }, { value: 52, percent: 14.3 }, { value: 56, percent: 14.3 }, { value: 60, percent: 14.3 }, { value: 64, percent: 14.3 }, { value: 68, percent: 14.3 }, { value: 72, percent: 14.3 }],
      triple: [{ value: 72, percent: 14.3 }, { value: 78, percent: 14.3 }, { value: 84, percent: 14.3 }, { value: 90, percent: 14.3 }, { value: 96, percent: 14.3 }, { value: 102, percent: 14.3 }, { value: 108, percent: 14.3 }],
      loosen: [{ value: -12, percent: 28.6 }, { value: -14, percent: 28.6 }, { value: -16, percent: 28.6 }, { value: -18, percent: 14.3 }],
      wind_center: [{ value: 36, percent: 14.3 }, { value: 40, percent: 14.3 }, { value: 42, percent: 14.3 }, { value: 46, percent: 14.3 }, { value: 48, percent: 14.3 }, { value: 52, percent: 14.3 }, { value: 54, percent: 14.3 }],
      wind_around: [{ value: 18, percent: 14.3 }, { value: 20, percent: 14.3 }, { value: 22, percent: 14.3 }, { value: 24, percent: 28.6 }, { value: 26, percent: 14.3 }, { value: 28, percent: 14.3 }],
    },
    regenerate: {
      regenerate: [{ value: -12, percent: 20 }, { value: -13, percent: 20 }, { value: -14, percent: 20 }, { value: -15, percent: 20 }, { value: -16, percent: 20 }],
    },
  };

  const actions = {
    sew: { label: "ぬう", multiplier: 1 },
    half: { label: "かげん", multiplier: 0.5 },
    double: { label: "2倍", multiplier: 2 },
    triple: { label: "3倍", multiplier: 3 },
    loosen: { label: "ほぐし", multiplier: -1 },
    wind_center: { label: "巻中心", multiplier: 1.5 },
    wind_around: { label: "巻周り", multiplier: 0.75 },
    regenerate: { label: "再生", multiplier: -1 },
  };

  // 会心×2は普通と同じダメージ分布を使うため、参照時にのみ普通へ読み替えます。
  function getDistribution(powerId, actionId) {
    const distributionPowerId = powerId === "critical_x2" ? "normal" : powerId;
    return distributions[distributionPowerId]?.[actionId] || null;
  }

  function getRange(powerId, actionId) {
    const values = getDistribution(powerId, actionId);

    if (!values) {
      return null;
    }

    const nums = values.map((item) => item.value);
    return [Math.min(...nums), Math.max(...nums)];
  }

  global.DQ10SewingDamage = {
    source: "https://dqxx.xyz/dq10-sewing-numerical-table/",
    criticalMultiplier: 2,
    actions,
    distributions,
    getDistribution,
    getRange,
    powerStates: [
      { id: "weak", label: "弱い" },
      { id: "normal", label: "普通" },
      { id: "strong", label: "強い" },
      { id: "strongest", label: "最強" },
      { id: "critical_x2", label: "会心×2" },
    ],
  };
})(window);
