(function (global) {
  const ranges = {
    2000: { normal: [18, 27], power_1_2: [23, 33], power_2_0: [36, 54], power_2_5: [45, 68], power_3_0: [54, 81], power_0_5: [9, 14], power_0_8: [15, 23] },
    1950: { normal: [18, 27], power_1_2: [23, 33], power_2_0: [36, 54], power_2_5: [45, 67], power_3_0: [54, 80], power_0_5: [9, 14], power_0_8: [15, 23] },
    1900: { normal: [18, 27], power_1_2: [22, 32], power_2_0: [35, 53], power_2_5: [44, 66], power_3_0: [53, 79], power_0_5: [9, 14], power_0_8: [15, 22] },
    1850: { normal: [18, 26], power_1_2: [22, 32], power_2_0: [35, 52], power_2_5: [43, 65], power_3_0: [52, 77], power_0_5: [9, 13], power_0_8: [15, 22] },
    1800: { normal: [17, 26], power_1_2: [21, 31], power_2_0: [34, 51], power_2_5: [42, 63], power_3_0: [51, 76], power_0_5: [9, 13], power_0_8: [14, 21] },
    1750: { normal: [17, 25], power_1_2: [21, 31], power_2_0: [33, 50], power_2_5: [42, 62], power_3_0: [50, 75], power_0_5: [9, 13], power_0_8: [14, 21] },
    1700: { normal: [17, 25], power_1_2: [21, 30], power_2_0: [33, 49], power_2_5: [41, 61], power_3_0: [49, 73], power_0_5: [9, 13], power_0_8: [14, 21] },
    1650: { normal: [16, 24], power_1_2: [20, 30], power_2_0: [32, 48], power_2_5: [40, 60], power_3_0: [48, 72], power_0_5: [8, 12], power_0_8: [14, 20] },
    1600: { normal: [16, 24], power_1_2: [20, 29], power_2_0: [32, 47], power_2_5: [39, 59], power_3_0: [47, 71], power_0_5: [8, 12], power_0_8: [13, 20] },
    1550: { normal: [16, 23], power_1_2: [20, 29], power_2_0: [31, 46], power_2_5: [39, 58], power_3_0: [46, 69], power_0_5: [8, 12], power_0_8: [13, 20] },
    1500: { normal: [15, 23], power_1_2: [19, 28], power_2_0: [30, 45], power_2_5: [38, 57], power_3_0: [45, 68], power_0_5: [8, 12], power_0_8: [13, 19] },
    1450: { normal: [15, 23], power_1_2: [19, 27], power_2_0: [30, 45], power_2_5: [37, 56], power_3_0: [45, 67], power_0_5: [8, 12], power_0_8: [13, 19] },
    1400: { normal: [15, 22], power_1_2: [18, 27], power_2_0: [29, 44], power_2_5: [36, 54], power_3_0: [44, 65], power_0_5: [8, 11], power_0_8: [12, 18] },
    1350: { normal: [15, 22], power_1_2: [18, 26], power_2_0: [29, 43], power_2_5: [36, 53], power_3_0: [43, 64], power_0_5: [8, 11], power_0_8: [12, 18] },
    1300: { normal: [14, 21], power_1_2: [18, 26], power_2_0: [28, 42], power_2_5: [35, 52], power_3_0: [42, 63], power_0_5: [7, 11], power_0_8: [12, 18] },
    1250: { normal: [14, 21], power_1_2: [17, 25], power_2_0: [27, 41], power_2_5: [34, 51], power_3_0: [41, 61], power_0_5: [7, 11], power_0_8: [12, 17] },
    1200: { normal: [14, 20], power_1_2: [17, 25], power_2_0: [27, 40], power_2_5: [33, 50], power_3_0: [40, 60], power_0_5: [7, 10], power_0_8: [11, 17] },
    1150: { normal: [13, 20], power_1_2: [17, 24], power_2_0: [26, 39], power_2_5: [33, 49], power_3_0: [39, 59], power_0_5: [7, 10], power_0_8: [11, 17] },
    1100: { normal: [13, 19], power_1_2: [16, 24], power_2_0: [26, 38], power_2_5: [32, 48], power_3_0: [38, 57], power_0_5: [7, 10], power_0_8: [11, 16] },
    1050: { normal: [13, 19], power_1_2: [16, 23], power_2_0: [25, 37], power_2_5: [31, 47], power_3_0: [37, 56], power_0_5: [7, 10], power_0_8: [11, 16] },
    1000: { normal: [12, 18], power_1_2: [15, 22], power_2_0: [24, 36], power_2_5: [30, 45], power_3_0: [36, 54], power_0_5: [6, 9], power_0_8: [10, 15] },
    950: { normal: [12, 18], power_1_2: [15, 22], power_2_0: [24, 36], power_2_5: [30, 44], power_3_0: [36, 53], power_0_5: [6, 9], power_0_8: [10, 15] },
    900: { normal: [12, 18], power_1_2: [15, 21], power_2_0: [23, 35], power_2_5: [29, 43], power_3_0: [35, 52], power_0_5: [6, 9], power_0_8: [10, 15] },
    850: { normal: [12, 17], power_1_2: [14, 21], power_2_0: [23, 34], power_2_5: [28, 42], power_3_0: [34, 50], power_0_5: [6, 9], power_0_8: [10, 14] },
    800: { normal: [11, 17], power_1_2: [14, 20], power_2_0: [22, 33], power_2_5: [27, 41], power_3_0: [33, 49], power_0_5: [6, 9], power_0_8: [9, 14] },
    750: { normal: [11, 16], power_1_2: [14, 20], power_2_0: [21, 32], power_2_5: [27, 40], power_3_0: [32, 48], power_0_5: [6, 8], power_0_8: [9, 14] },
    700: { normal: [11, 16], power_1_2: [13, 19], power_2_0: [21, 31], power_2_5: [26, 39], power_3_0: [31, 46], power_0_5: [6, 8], power_0_8: [9, 13] },
    650: { normal: [10, 15], power_1_2: [13, 19], power_2_0: [20, 30], power_2_5: [25, 38], power_3_0: [30, 45], power_0_5: [5, 8], power_0_8: [9, 13] },
    600: { normal: [10, 15], power_1_2: [12, 18], power_2_0: [20, 29], power_2_5: [24, 36], power_3_0: [29, 44], power_0_5: [5, 8], power_0_8: [8, 12] },
    550: { normal: [10, 14], power_1_2: [12, 18], power_2_0: [19, 28], power_2_5: [24, 35], power_3_0: [28, 42], power_0_5: [5, 7], power_0_8: [8, 12] },
    500: { normal: [9, 14], power_1_2: [12, 17], power_2_0: [18, 27], power_2_5: [23, 34], power_3_0: [27, 41], power_0_5: [5, 7], power_0_8: [8, 12] },
    450: { normal: [9, 14], power_1_2: [11, 16], power_2_0: [18, 27], power_2_5: [22, 33], power_3_0: [27, 40], power_0_5: [5, 7], power_0_8: [8, 11] },
    400: { normal: [9, 13], power_1_2: [11, 16], power_2_0: [17, 26], power_2_5: [21, 32], power_3_0: [26, 38], power_0_5: [5, 7], power_0_8: [7, 11] },
    350: { normal: [9, 13], power_1_2: [11, 15], power_2_0: [17, 25], power_2_5: [21, 31], power_3_0: [25, 37], power_0_5: [5, 7], power_0_8: [7, 11] },
    300: { normal: [8, 12], power_1_2: [10, 15], power_2_0: [16, 24], power_2_5: [20, 30], power_3_0: [24, 36], power_0_5: [4, 6], power_0_8: [7, 10] },
    250: { normal: [8, 12], power_1_2: [10, 14], power_2_0: [15, 23], power_2_5: [19, 29], power_3_0: [23, 34], power_0_5: [4, 6], power_0_8: [7, 10] },
    200: { normal: [8, 11], power_1_2: [9, 14], power_2_0: [15, 22], power_2_5: [18, 27], power_3_0: [22, 33], power_0_5: [4, 6], power_0_8: [6, 9] },
    150: { normal: [7, 11], power_1_2: [9, 13], power_2_0: [14, 21], power_2_5: [18, 26], power_3_0: [21, 32], power_0_5: [4, 6], power_0_8: [6, 9] },
    100: { normal: [7, 10], power_1_2: [9, 13], power_2_0: [14, 20], power_2_5: [17, 25], power_3_0: [20, 30], power_0_5: [4, 5], power_0_8: [6, 9] },
    50: { normal: [7, 10], power_1_2: [8, 12], power_2_0: [13, 19], power_2_5: [16, 24], power_3_0: [19, 29], power_0_5: [4, 5], power_0_8: [6, 8] },
  };

  const powers = {
    power_0_5: { label: "0.5倍", multiplier: 0.5 },
    power_0_8: { label: "0.8倍", multiplier: 0.8 },
    normal: { label: "通常", multiplier: 1 },
    power_1_2: { label: "1.2倍", multiplier: 1.2 },
    power_2_0: { label: "2倍", multiplier: 2 },
    power_2_5: { label: "2.5倍", multiplier: 2.5 },
    power_3_0: { label: "3倍", multiplier: 3 },
  };

  const temperatures = Object.keys(ranges).map(Number).sort((a, b) => b - a);

  global.DQ10SmithingDamage = {
    source: "https://xn--10-yg4a1a3kyh.jp/dq10_kaji_1.html",
    basePowerId: "normal",
    criticalMultiplier: 2,
    powers,
    ranges,
    heatStates: temperatures.map((temperature) => ({
      id: String(temperature),
      label: `${temperature}℃`,
    })),
  };
})(window);
