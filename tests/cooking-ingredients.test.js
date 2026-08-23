const assert = require("node:assert/strict");
const cookingIngredients = require("../app/cooking-ingredients.js");

{
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("肉"), "meat");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("魚の切り身"), "fish");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("魚"), "fish");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("野菜"), "vegetable");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("麺"), "noodle");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("卵"), "egg");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("小麦"), "wheat");
}

{
  const visual = cookingIngredients.getCookingIngredientVisual({
    ingredientGroupLabel: "卵",
  });

  assert.equal(visual.id, "egg");
  assert.equal(visual.label, "卵");
  assert.equal(visual.src, "./assets/cooking/ingredient-egg.png");
  assert.equal(visual.isInferred, false);
}

{
  const visual = cookingIngredients.getCookingIngredientVisual({
    ingredientGroupLabel: "小麦",
  });

  assert.equal(visual.id, "wheat");
  assert.equal(visual.label, "小麦");
  assert.equal(visual.src, "./assets/cooking/ingredient-wheat.png");
  assert.equal(visual.isInferred, false);
}

{
  const visual = cookingIngredients.getCookingIngredientVisual(
    { ingredientGroupLabel: "" },
    { categoryId: "fish-dishes", category: "魚料理", name: "いやしのムニエル" },
  );

  assert.equal(visual, null);
}

{
  const visual = cookingIngredients.getCookingIngredientVisual(
    { ingredientGroupLabel: "" },
    { categoryId: "pasta-rice", category: "パスタ＆ライス", name: "ヒールカルボナーラ" },
  );

  assert.equal(visual, null);
}

{
  assert.equal(cookingIngredients.getCookingIngredientVisual(
    { ingredientGroupLabel: "" },
    { categoryId: "sweets", category: "スイーツ", name: "クイックケーキ" },
  ), null);
}

{
  const context = cookingIngredients.getCookingIngredientVisualContext(null, {
    recipeName: "手入力",
    recipeCategoryId: "meat-dishes",
    recipeCategory: "肉料理",
  });
  const visual = cookingIngredients.getCookingIngredientVisual(
    { ingredientGroupLabel: "" },
    context,
  );

  assert.equal(context.categoryId, "meat-dishes");
  assert.equal(visual, null);
}

{
  const context = cookingIngredients.getCookingIngredientVisualContext(null, {
    recipeName: "手入力",
    recipeCategoryId: "meat-dishes",
    recipeCategory: "肉料理",
  });
  const visual = cookingIngredients.getCookingIngredientVisual(
    { ingredientGroupLabel: "肉" },
    context,
  );

  assert.equal(visual.id, "meat");
  assert.equal(visual.isInferred, false);
}
