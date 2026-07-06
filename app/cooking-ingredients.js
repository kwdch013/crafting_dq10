(function (global) {
  const visuals = {
    meat: {
      id: "meat",
      label: "肉",
      className: "cooking-ingredient-meat",
      src: "./assets/cooking/ingredient-meat.png",
    },
    fish: {
      id: "fish",
      label: "魚",
      className: "cooking-ingredient-fish",
      src: "./assets/cooking/ingredient-fish.png",
    },
    vegetable: {
      id: "vegetable",
      label: "野菜",
      className: "cooking-ingredient-vegetable",
      src: "./assets/cooking/ingredient-vegetable.png",
    },
    noodle: {
      id: "noodle",
      label: "麺",
      className: "cooking-ingredient-noodle",
      src: "./assets/cooking/ingredient-noodle.png",
    },
    egg: {
      id: "egg",
      label: "卵",
      className: "cooking-ingredient-egg",
      src: "./assets/cooking/ingredient-egg.png",
    },
    wheat: {
      id: "wheat",
      label: "小麦",
      className: "cooking-ingredient-wheat",
      src: "./assets/cooking/ingredient-wheat.png",
    },
  };

  function normalizeCookingIngredientKind(value) {
    const label = String(value || "").trim();

    if (!label) {
      return "";
    }

    if (label.includes("魚")) {
      return "fish";
    }

    if (label.includes("肉")) {
      return "meat";
    }

    if (label.includes("野菜")) {
      return "vegetable";
    }

    if (label.includes("麺") || label.includes("パスタ")) {
      return "noodle";
    }

    if (label.includes("卵") || label.includes("たまご")) {
      return "egg";
    }

    if (label.includes("小麦")) {
      return "wheat";
    }

    return "";
  }

  function inferCookingIngredientKind(recipe) {
    return "";
  }

  function getCookingIngredientVisual(ingredient, recipe) {
    const directKind = normalizeCookingIngredientKind(ingredient?.ingredientGroupLabel);
    const directVisual = visuals[directKind];

    if (directVisual) {
      return {
        ...directVisual,
        isInferred: false,
      };
    }

    const inferredKind = inferCookingIngredientKind(recipe);
    const inferredVisual = visuals[inferredKind];

    return inferredVisual
      ? {
        ...inferredVisual,
        isInferred: true,
      }
      : null;
  }

  function getCookingIngredientVisualContext(recipe, state) {
    if (recipe) {
      return recipe;
    }

    const fallback = {
      name: state?.recipeName || "",
      categoryId: state?.recipeCategoryId || "",
      category: state?.recipeCategory || "",
    };

    return fallback.name || fallback.categoryId || fallback.category
      ? fallback
      : null;
  }

  const api = {
    getCookingIngredientVisualContext,
    getCookingIngredientVisual,
    inferCookingIngredientKind,
    normalizeCookingIngredientKind,
    visuals,
  };

  global.DQ10CookingIngredients = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
