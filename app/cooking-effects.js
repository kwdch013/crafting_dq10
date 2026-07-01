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

	const api = {
		getInitialCookingEffectMode,
		normalizeCookingEffectMode,
		normalizeSavedCookingEffectMode,
	};

	global.DQ10CookingEffects = api;

	if (typeof module !== "undefined" && module.exports) {
		module.exports = api;
	}
})(typeof window !== "undefined" ? window : globalThis);
