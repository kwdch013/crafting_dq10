(function (global) {
  const japaneseCollator = new Intl.Collator("ja-JP", { numeric: true, sensitivity: "base" });

  function isArchivedRecipe(recipe) {
    return recipe?.archived === true;
  }

  // レシピ一覧はカテゴリでまとめ、同じカテゴリ内を五十音順に整列します。
  function compareRecipeOrder(left, right) {
    const leftCategory = left?.category || left?.categoryId || "";
    const rightCategory = right?.category || right?.categoryId || "";
    if (leftCategory && !rightCategory) {
      return -1;
    }
    if (!leftCategory && rightCategory) {
      return 1;
    }

    const categoryOrder = japaneseCollator.compare(leftCategory, rightCategory);
    if (categoryOrder !== 0) {
      return categoryOrder;
    }

    return japaneseCollator.compare(left?.name || "", right?.name || "");
  }

  function getVisibleRecipes(recipes) {
    return Array.isArray(recipes)
      ? recipes.filter((recipe) => !isArchivedRecipe(recipe)).sort(compareRecipeOrder)
      : [];
  }

  // レシピ選択欄には全職人で手入力項目を表示しません。
  function shouldShowCustomRecipeOption(config) {
    return false;
  }

  const api = {
    compareRecipeOrder,
    getVisibleRecipes,
    isArchivedRecipe,
    shouldShowCustomRecipeOption,
  };

  global.DQ10RecipeArchive = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
