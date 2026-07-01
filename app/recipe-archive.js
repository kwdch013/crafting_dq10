(function (global) {
  function isArchivedRecipe(recipe) {
    return recipe?.archived === true;
  }

  function getVisibleRecipes(recipes) {
    return Array.isArray(recipes)
      ? recipes.filter((recipe) => !isArchivedRecipe(recipe))
      : [];
  }

  const api = {
    getVisibleRecipes,
    isArchivedRecipe,
  };

  global.DQ10RecipeArchive = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
