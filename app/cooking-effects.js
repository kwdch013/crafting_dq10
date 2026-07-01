(function (global) {
	function normalizeCookingEffectMode(traitId, value) {
		if (traitId !== "light-return") {
			return "none";
		}

		if (value === "cross-glow" || value === "corner-return") {
			return value;
		}

		return "none";
	}

	function getInitialCookingEffectMode() {
		return "none";
	}

	function normalizeSavedCookingEffectMode() {
		return "none";
	}

	function toggleCookingLight(ingredients, ingredientId) {
		const ingredient = ingredients.find((candidate) => candidate.id === ingredientId);

		if (!ingredient) {
			return false;
		}

		ingredient.isGlowing = ingredient.isGlowing !== true;
		return true;
	}

	function clearCookingLight(ingredients) {
		const hasGlowing = ingredients.some((ingredient) => ingredient.isGlowing === true);

		if (!hasGlowing) {
			return false;
		}

		ingredients.forEach((ingredient) => {
			ingredient.isGlowing = false;
		});
		return true;
	}

	function getCookingEffectButtonState(state) {
		const isCooking = state?.craftType === "cooking";
		const isLight = isCooking && state.traitId === "light";
		const isLightReturn = isCooking && state.traitId === "light-return";
		const hasGlowing = isLight && state.ingredients.some((ingredient) => ingredient.isGlowing === true);

		return {
			clearLight: {
				hidden: !isLight,
				disabled: !hasGlowing,
				active: false,
			},
			clearEffect: {
				hidden: !isLightReturn,
				disabled: false,
				active: isLightReturn && state.cookingEffectMode === "none",
			},
			crossGlow: {
				hidden: !isLightReturn,
				disabled: false,
				active: isLightReturn && state.cookingEffectMode === "cross-glow",
			},
			cornerReturn: {
				hidden: !isLightReturn,
				disabled: false,
				active: isLightReturn && state.cookingEffectMode === "corner-return",
			},
		};
	}

	const api = {
		clearCookingLight,
		getInitialCookingEffectMode,
		getCookingEffectButtonState,
		normalizeCookingEffectMode,
		normalizeSavedCookingEffectMode,
		toggleCookingLight,
	};

	global.DQ10CookingEffects = api;

	if (typeof module !== "undefined" && module.exports) {
		module.exports = api;
	}
})(typeof window !== "undefined" ? window : globalThis);
