(function (global) {
  // 旧localStorage控えをAPIへ順番に移し、サーバー発番IDとの対応を返します。
  async function importLocalRecipes({
    craftIds,
    getUserRecipes,
    getApiRecipeIds,
    createRecipe,
    replaceUserRecipe,
    onImported,
  } = {}) {
    const importedRecipeIds = new Map();
    const targetCraftIds = Array.isArray(craftIds) ? craftIds : [];

    for (const craftId of targetCraftIds) {
      let userRecipes;
      let apiRecipeIds;
      try {
        userRecipes = getUserRecipes(craftId);
        apiRecipeIds = getApiRecipeIds(craftId);
      } catch (error) {
        console.warn("localStorageレシピの取り込み準備に失敗しました", { craftId, error });
        continue;
      }

      const recipes = Array.isArray(userRecipes) ? userRecipes : [];
      const existingIds = apiRecipeIds instanceof Set ? apiRecipeIds : new Set();
      for (const recipe of recipes) {
        if (existingIds.has(recipe?.id)) {
          continue;
        }

        try {
          // sort_orderの採番競合を避けるため、POSTは並行実行しません。
          const savedRecipe = await createRecipe(craftId, recipe);
          if (typeof savedRecipe?.id !== "string") {
            throw new Error("サーバー発番レシピIDが返されませんでした");
          }
          replaceUserRecipe(craftId, recipe.id, savedRecipe);
          importedRecipeIds.set(recipe.id, savedRecipe.id);
          onImported(craftId, recipe.id, savedRecipe.id);
        } catch (error) {
          // 失敗した控えは残し、次回起動時に再試行できるようにします。
          console.warn("localStorageレシピの取り込みに失敗しました", {
            craftId,
            recipeId: recipe?.id,
            error,
          });
        }
      }
    }

    return importedRecipeIds;
  }

  const api = { importLocalRecipes };

  global.DQ10RecipeSync = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
