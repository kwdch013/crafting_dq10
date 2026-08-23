(function (global) {
  function findResetRecipe(recipes, state) {
    if (!Array.isArray(recipes) || recipes.length === 0) {
      return null;
    }

    return recipes.find((recipe) => recipe.id === state?.recipeId) ||
      recipes.find((recipe) => recipe.name === state?.recipeName) ||
      recipes[0];
  }

  function getResetFocusSelection(state) {
    return {
      level: state?.level,
      toolId: state?.toolId,
      toolStars: state?.toolStars,
    };
  }

  const api = {
    findResetRecipe,
    getResetFocusSelection,
  };

  global.DQ10StateReset = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
