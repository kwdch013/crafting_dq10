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
      label: "魚の切り身",
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

    return "";
  }

  function inferCookingIngredientKind(recipe) {
    const recipeName = String(recipe?.name || "");

    if (recipeName.includes("パスタ") || recipeName.includes("カルボナーラ")) {
      return "noodle";
    }

    if (recipe?.categoryId === "meat-dishes" || recipe?.category === "肉料理") {
      return "meat";
    }

    if (recipe?.categoryId === "fish-dishes" || recipe?.category === "魚料理") {
      return "fish";
    }

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

  const api = {
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
