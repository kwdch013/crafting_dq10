const assert = require("node:assert/strict");
const effects = require("../app/cooking-effects.js");

{
	assert.equal(effects.normalizeCookingEffectMode("light-return", "cross-glow"), "cross-glow");
	assert.equal(effects.normalizeCookingEffectMode("light-return", "corner-return"), "corner-return");
	assert.equal(effects.normalizeCookingEffectMode("light-return", "none"), "none");
	assert.equal(effects.normalizeCookingEffectMode("light", "cross-glow"), "none");
}

{
	assert.equal(effects.getInitialCookingEffectMode("light-return"), "none");
	assert.equal(effects.getInitialCookingEffectMode("light"), "none");
	assert.equal(effects.getInitialCookingEffectMode("recovery"), "none");
}

{
	assert.equal(effects.normalizeSavedCookingEffectMode("light-return", "cross-glow"), "none");
	assert.equal(effects.normalizeSavedCookingEffectMode("light-return", "corner-return"), "none");
	assert.equal(effects.normalizeSavedCookingEffectMode("light-return", "none"), "none");
}

{
	const ingredients = [
		{ id: "food-1", isGlowing: false },
		{ id: "food-2", isGlowing: true },
	];

	assert.equal(effects.toggleCookingLight(ingredients, "food-1"), true);
	assert.equal(ingredients[0].isGlowing, true);
	assert.equal(effects.toggleCookingLight(ingredients, "missing"), false);
	assert.equal(effects.clearCookingLight(ingredients), true);
	assert.equal(ingredients.every((ingredient) => ingredient.isGlowing === false), true);
	assert.equal(effects.clearCookingLight(ingredients), false);
}

{
	const state = {
		craftType: "cooking",
		traitId: "light",
		cookingEffectMode: "none",
		ingredients: [{ isGlowing: true }],
	};
	const buttonState = effects.getCookingEffectButtonState(state);

	assert.deepEqual(buttonState.clearLight, {
		hidden: false,
		disabled: false,
		active: false,
	});
	assert.equal(buttonState.clearEffect.hidden, true);
	assert.equal(buttonState.crossGlow.hidden, true);
	assert.equal(buttonState.cornerReturn.hidden, true);
}

{
	const state = {
		craftType: "cooking",
		traitId: "light-return",
		cookingEffectMode: "none",
		ingredients: [{ isGlowing: true }],
	};
	const buttonState = effects.getCookingEffectButtonState(state);

	assert.equal(buttonState.clearLight.hidden, true);
	assert.deepEqual(buttonState.clearEffect, {
		hidden: false,
		disabled: false,
		active: true,
	});
	assert.equal(buttonState.crossGlow.active, false);
	assert.equal(buttonState.cornerReturn.active, false);
}
