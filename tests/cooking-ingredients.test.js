const assert = require("node:assert/strict");
const cookingIngredients = require("../app/cooking-ingredients.js");

{
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("肉"), "meat");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("魚の切り身"), "fish");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("野菜"), "vegetable");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("麺"), "noodle");
  assert.equal(cookingIngredients.normalizeCookingIngredientKind("卵"), "egg");
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
  const visual = cookingIngredients.getCookingIngredientVisual(
    { ingredientGroupLabel: "" },
    { categoryId: "fish-dishes", category: "魚料理", name: "いやしのムニエル" },
  );

  assert.equal(visual.id, "fish");
  assert.equal(visual.isInferred, true);
}

{
  const visual = cookingIngredients.getCookingIngredientVisual(
    { ingredientGroupLabel: "" },
    { categoryId: "pasta-rice", category: "パスタ＆ライス", name: "ヒールカルボナーラ" },
  );

  assert.equal(visual.id, "noodle");
  assert.equal(visual.isInferred, true);
}

{
  assert.equal(cookingIngredients.getCookingIngredientVisual(
    { ingredientGroupLabel: "" },
    { categoryId: "sweets", category: "スイーツ", name: "クイックケーキ" },
  ), null);
}
