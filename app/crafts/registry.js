(function (global) {
  global.DQ10CraftConfigs = global.DQ10CraftConfigs || {};
  global.DQ10CraftRecipes = global.DQ10CraftRecipes || {};

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
          result[star] = toolType.focusBonusByStars?.[star] ?? 0;
          return result;
        }, {}),
      })),
      stars,
    };
  };
})(window);
