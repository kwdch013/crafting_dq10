(function (global) {
  // 旧localStorage控えをAPIへ順番に移し、サーバー発番IDとの対応を返します。
  async function importLocalRecipes({
    craftIds,
    getUserRecipes,
    getDeletedRecipeIds,
    getApiRecipeIds,
    getServerDeletedRecipeIds,
    createRecipe,
    replaceUserRecipe,
    removeUserRecipe,
    onImported,
  } = {}) {
    const importedRecipeIds = new Map();
    const targetCraftIds = Array.isArray(craftIds) ? craftIds : [];

    for (const craftId of targetCraftIds) {
      let userRecipes;
      let deletedRecipeIds;
      let apiRecipeIds;
      try {
        userRecipes = getUserRecipes(craftId);
        deletedRecipeIds = typeof getDeletedRecipeIds === "function" ? getDeletedRecipeIds(craftId) : [];
        apiRecipeIds = getApiRecipeIds(craftId);
      } catch (error) {
        console.warn("localStorageレシピの取り込み準備に失敗しました", { craftId, error });
        continue;
      }

      const recipes = Array.isArray(userRecipes) ? userRecipes : [];
      const deletedIds = new Set(Array.isArray(deletedRecipeIds) ? deletedRecipeIds : []);
      const existingIds = apiRecipeIds instanceof Set ? apiRecipeIds : new Set();
      let serverDeletedIds = new Set();
      if (typeof getServerDeletedRecipeIds === "function") {
        try {
          const deletedRecipeIds = await getServerDeletedRecipeIds(craftId);
          serverDeletedIds = new Set(Array.isArray(deletedRecipeIds) ? deletedRecipeIds : []);
        } catch (error) {
          // 削除状態が不明な職人へのPOSTは、意図しない論理削除レシピの復活につながります。
          console.warn("サーバーの削除済みレシピID取得に失敗しました", { craftId, error });
          continue;
        }
      }
      for (const recipe of recipes) {
        // 現行の保存処理では作成されない、旧版の保存データや壊れたlocalStorageの共存状態でも削除を優先します。
        if (deletedIds.has(recipe?.id)) {
          continue;
        }
        if (existingIds.has(recipe?.id)) {
          continue;
        }
        if (serverDeletedIds.has(recipe?.id)) {
          if (typeof removeUserRecipe === "function") {
            removeUserRecipe(craftId, recipe.id);
          }
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
