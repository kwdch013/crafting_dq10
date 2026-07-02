(function (global) {
	function toFiniteNumber(value, fallback) {
		if (value === "") {
			return fallback;
		}

		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	function normalizeEditValue(currentValue, inputValue) {
		const current = toFiniteNumber(inputValue.current, toFiniteNumber(currentValue.current, 0));
		return {
			current,
			isGlowing: inputValue.isGlowing === true,
			cookingEffectMode: inputValue.cookingEffectMode || "none",
			locked: inputValue.locked === true,
		};
	}

	global.DQ10BoardCellEditor = {
		normalizeEditValue,
	};

	if (typeof module !== "undefined") {
		module.exports = global.DQ10BoardCellEditor;
	}
})(typeof window !== "undefined" ? window : globalThis);
