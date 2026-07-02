(function (global) {
  const ranges = {
    center: {
      normal: [12, 18],
      strong: [18, 27],
      half: [9, 14],
    },
    cross: {
      normal: [6, 9],
      strong: [9, 14],
      half: [5, 7],
    },
    corner: {
      normal: [3, 5],
      strong: [5, 7],
      half: [3, 4],
    },
  };

  const distributions = {
    center: {
      normal: [12, 13, 14, 15, 16, 17, 18],
      strong: [18, 20, 21, 23, 24, 26, 27],
      half: [9, 10, 11, 12, 12, 13, 14],
    },
    cross: {
      normal: [6, 7, 7, 8, 8, 9, 9],
      strong: [9, 10, 11, 12, 12, 13, 14],
      half: [5, 6, 6, 6, 6, 7, 7],
    },
    corner: {
      normal: [3, 4, 4, 4, 4, 5, 5],
      strong: [5, 5, 6, 6, 6, 7, 7],
      half: [3, 3, 3, 3, 3, 4, 4],
    },
  };

  const positions = [
    { id: "center", label: "中央" },
    { id: "cross", label: "上下左右" },
    { id: "corner", label: "四隅" },
  ];

  const specialRanges = [
    {
      id: "light",
      label: "光マス",
      ranges: {
        normal: [24, 36],
        strong: [36, 56],
        half: [18, 27],
      },
    },
  ];

  const specialDistributions = {
    light: {
      normal: [24, 26, 28, 30, 32, 34, 36],
      strong: [36, 39, 42, 45, 48, 51, 56],
      half: [18, 20, 21, 23, 24, 26, 27],
    },
  };

  const heatStates = [
    { id: "normal", label: "通常" },
    { id: "strong", label: "強火" },
    { id: "half", label: "半減" },
  ];

  function getRange(positionId, conditionId) {
    return ranges[positionId]?.[conditionId] || null;
  }

  function getSpecialRange(specialId, conditionId) {
    const specialRange = specialRanges.find((item) => item.id === specialId);
    return specialRange?.ranges?.[conditionId] || null;
  }

  function getSpecialValues(specialId, conditionId) {
    return specialDistributions[specialId]?.[conditionId] || null;
  }

  global.DQ10CookingDamage = {
    source: "https://xn--10-yg4a1a3kyh.jp/dq10_artisan8.html",
    positions,
    specialRanges,
    heatStates,
    distributions,
    specialDistributions,
    ranges,
    getRange,
    getSpecialRange,
    getSpecialValues,
  };
})(window);
