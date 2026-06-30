(function (global) {
  global.DQ10CraftConfigs = global.DQ10CraftConfigs || {};
  global.DQ10CraftRecipes = global.DQ10CraftRecipes || {};

  const focusLevelTables = {
    smithing: [
      { level: 1, focus: 50 },
      { level: 2, focus: 52 },
      { level: 3, focus: 53 },
      { level: 4, focus: 56 },
      { level: 5, focus: 57 },
      { level: 6, focus: 60 },
      { level: 7, focus: 61 },
      { level: 8, focus: 64 },
      { level: 9, focus: 67 },
      { level: 10, focus: 67 },
      { level: 11, focus: 70 },
      { level: 12, focus: 73 },
      { level: 13, focus: 73 },
      { level: 14, focus: 76 },
      { level: 15, focus: 79 },
      { level: 16, focus: 79 },
      { level: 17, focus: 82 },
      { level: 18, focus: 84 },
      { level: 19, focus: 87 },
      { level: 20, focus: 87 },
      { level: 21, focus: 90 },
      { level: 22, focus: 93 },
      { level: 23, focus: 93 },
      { level: 24, focus: 96 },
      { level: 25, focus: 98 },
      { level: 26, focus: 101 },
      { level: 27, focus: 101 },
      { level: 28, focus: 104 },
      { level: 29, focus: 109 },
      { level: 30, focus: 109 },
      { level: 31, focus: 112 },
      { level: 32, focus: 113 },
      { level: 33, focus: 113 },
      { level: 34, focus: 115 },
      { level: 35, focus: 119 },
      { level: 36, focus: 122 },
      { level: 37, focus: 123 },
      { level: 38, focus: 123 },
      { level: 39, focus: 125 },
      { level: 40, focus: 129 },
      { level: 41, focus: 132 },
      { level: 42, focus: 134 },
      { level: 43, focus: 137 },
      { level: 44, focus: 139 },
      { level: 45, focus: 139 },
      { level: 46, focus: 142 },
      { level: 47, focus: 142 },
      { level: 48, focus: 144 },
      { level: 49, focus: 147 },
      { level: 50, focus: 149 },
      { level: 51, focus: 152 },
      { level: 52, focus: 152 },
      { level: 53, focus: 154 },
      { level: 54, focus: 157 },
      { level: 55, focus: 159 },
      { level: 56, focus: 162 },
      { level: 57, focus: 162 },
      { level: 58, focus: 164 },
      { level: 59, focus: 167 },
      { level: 60, focus: 169 },
      { level: 61, focus: 171 },
      { level: 62, focus: 171 },
      { level: 63, focus: 173 },
      { level: 64, focus: 175 },
      { level: 65, focus: 177 },
      { level: 66, focus: 180 },
      { level: 67, focus: 182 },
      { level: 68, focus: 184 },
      { level: 69, focus: 186 },
      { level: 70, focus: 188 },
      { level: 71, focus: 189 },
      { level: 72, focus: 191 },
      { level: 73, focus: 193 },
      { level: 74, focus: 195 },
      { level: 75, focus: 197 },
      { level: 76, focus: 199, provisional: true },
      { level: 77, focus: 201, provisional: true },
      { level: 78, focus: 203, provisional: true },
      { level: 79, focus: 205, provisional: true },
      { level: 80, focus: 207, provisional: true },
    ],
    cooking: [
      { level: 1, focus: 50 },
      { level: 2, focus: 52 },
      { level: 3, focus: 55 },
      { level: 4, focus: 56 },
      { level: 5, focus: 58 },
      { level: 6, focus: 60 },
      { level: 7, focus: 61 },
      { level: 8, focus: 64 },
      { level: 9, focus: 67 },
      { level: 10, focus: 67 },
      { level: 11, focus: 70 },
      { level: 12, focus: 71 },
      { level: 13, focus: 73 },
      { level: 14, focus: 76 },
      { level: 15, focus: 76 },
      { level: 16, focus: 79 },
      { level: 17, focus: 82 },
      { level: 18, focus: 84 },
      { level: 19, focus: 87 },
      { level: 20, focus: 87 },
      { level: 21, focus: 90 },
      { level: 22, focus: 94 },
      { level: 23, focus: 94 },
      { level: 24, focus: 96 },
      { level: 25, focus: 98 },
      { level: 26, focus: 101 },
      { level: 27, focus: 101 },
      { level: 28, focus: 104 },
      { level: 29, focus: 109 },
      { level: 30, focus: 109 },
      { level: 31, focus: 112 },
      { level: 32, focus: 113 },
      { level: 33, focus: 113 },
      { level: 34, focus: 115 },
      { level: 35, focus: 119 },
      { level: 36, focus: 122 },
      { level: 37, focus: 122 },
      { level: 38, focus: 123 },
      { level: 39, focus: 125 },
      { level: 40, focus: 129 },
      { level: 41, focus: 132 },
      { level: 42, focus: 134 },
      { level: 43, focus: 136 },
      { level: 44, focus: 139 },
      { level: 45, focus: 139 },
      { level: 46, focus: 142 },
      { level: 47, focus: 142 },
      { level: 48, focus: 144 },
      { level: 49, focus: 147 },
      { level: 50, focus: 149 },
      { level: 51, focus: 152 },
      { level: 52, focus: 152 },
      { level: 53, focus: 154 },
      { level: 54, focus: 157 },
      { level: 55, focus: 159 },
      { level: 56, focus: 162 },
      { level: 57, focus: 162 },
      { level: 58, focus: 164 },
      { level: 59, focus: 167 },
      { level: 60, focus: 169 },
      { level: 61, focus: 171 },
      { level: 62, focus: 171 },
      { level: 63, focus: 173 },
      { level: 64, focus: 175 },
      { level: 65, focus: 177 },
      { level: 66, focus: 180 },
      { level: 67, focus: 182 },
      { level: 68, focus: 184 },
      { level: 69, focus: 186 },
      { level: 70, focus: 188 },
      { level: 71, focus: 189 },
      { level: 72, focus: 191 },
      { level: 73, focus: 193 },
      { level: 74, focus: 195 },
      { level: 75, focus: 197 },
      { level: 76, focus: 199, provisional: true },
      { level: 77, focus: 201, provisional: true },
      { level: 78, focus: 203, provisional: true },
      { level: 79, focus: 205, provisional: true },
      { level: 80, focus: 207, provisional: true },
    ],
  };

  const focusToolTypes = {
    smithingHammer: [
      { id: "copper-smithing-hammer", label: "銅の鍛冶ハンマー", focusBonus: 0 },
      { id: "iron-smithing-hammer", label: "鉄の鍛冶ハンマー", focusBonus: 10 },
      { id: "silver-smithing-hammer", label: "銀の鍛冶ハンマー", focusBonus: 15 },
      { id: "platinum-smithing-hammer", label: "プラチナ鍛冶ハンマー", focusBonus: 25 },
      { id: "super-smithing-hammer", label: "超鍛冶ハンマー", focusBonus: 35 },
      { id: "miracle-smithing-hammer", label: "奇跡の鍛冶ハンマー", focusBonus: 40 },
    ],
    fryingPan: [
      { id: "copper-frying-pan", label: "銅のフライパン", focusBonus: 0 },
      { id: "iron-frying-pan", label: "鉄のフライパン", focusBonus: 10 },
      { id: "silver-frying-pan", label: "銀のフライパン", focusBonus: 15 },
      { id: "platinum-frying-pan", label: "プラチナフライパン", focusBonus: 25 },
      { id: "super-frying-pan", label: "超フライパン", focusBonus: 35 },
      { id: "miracle-frying-pan", label: "奇跡のフライパン", focusBonus: 40 },
      { id: "light-frying-pan", label: "光のフライパン", focusBonus: 45 },
    ],
  };

  global.registerDQ10Craft = function registerDQ10Craft(config) {
    if (!config || !config.id) {
      throw new Error("Craft config requires an id.");
    }

    global.DQ10CraftConfigs[config.id] = config;
  };

  global.registerDQ10CraftRecipes = function registerDQ10CraftRecipes(craftId, recipes) {
    if (!craftId || !Array.isArray(recipes)) {
      throw new Error("Craft recipes require a craft id and recipe array.");
    }

    global.DQ10CraftRecipes[craftId] = recipes;
  };

  global.getDQ10FocusLevels = function getDQ10FocusLevels(kind) {
    return (focusLevelTables[kind] || []).map((entry) => ({ ...entry }));
  };

  global.getDQ10FocusToolTypes = function getDQ10FocusToolTypes(kind) {
    return (focusToolTypes[kind] || []).map((toolType) => ({ ...toolType }));
  };

  global.createDQ10FocusConfig = function createDQ10FocusConfig(options) {
    const stars = options.stars || [0, 1, 2, 3];

    return {
      defaultLevel: options.defaultLevel,
      defaultToolId: options.defaultToolId,
      defaultStars: options.defaultStars ?? 0,
      levels: options.levels || [{ level: options.defaultLevel, focus: options.defaultFocus }],
      tools: options.toolTypes.map((toolType) => ({
        id: toolType.id,
        label: toolType.label,
        focusBonusByStars: stars.reduce((result, star) => {
          result[star] = toolType.focusBonusByStars?.[star] ?? toolType.focusBonus ?? 0;
          return result;
        }, {}),
      })),
      stars,
    };
  };
})(window);
