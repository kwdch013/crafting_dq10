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
		heat: "normal",
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

{
	const state = {
		craftType: "cooking",
		heat: "strong",
		ingredients: [],
	};
	const buttonState = effects.getCookingHeatButtonState(state);

	assert.deepEqual(buttonState.normal, {
		hidden: false,
		disabled: false,
		active: false,
	});
	assert.deepEqual(buttonState.strong, {
		hidden: false,
		disabled: false,
		active: true,
	});
	assert.deepEqual(buttonState.half, {
		hidden: false,
		disabled: false,
		active: false,
	});
}

{
	const buttonState = effects.getCookingHeatButtonState({
		craftType: "weapon-smithing",
		heat: "normal",
		ingredients: [],
	});

	assert.equal(buttonState.normal.hidden, true);
	assert.equal(buttonState.strong.hidden, true);
	assert.equal(buttonState.half.hidden, true);
}
