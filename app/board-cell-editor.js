(function (global) {
	function toFiniteNumber(value, fallback) {
		if (value === "") {
			return fallback;
		}

		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	function normalizeRange(min, max) {
		const parsedMin = Number(min);
		const parsedMax = Number(max);

		if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) {
			return null;
		}

		return parsedMin <= parsedMax
			? [parsedMin, parsedMax]
			: [parsedMax, parsedMin];
	}

	function isCurrentInSuccessRange(current, item) {
		const range = normalizeRange(item?.successMin, item?.successMax);

		if (!range) {
			return true;
		}

		const parsedCurrent = Number(current);
		return Number.isFinite(parsedCurrent) && parsedCurrent >= range[0] && parsedCurrent <= range[1];
	}

	function normalizeEditValue(currentValue, inputValue) {
		const current = toFiniteNumber(inputValue.current, toFiniteNumber(currentValue.current, 0));
		return {
			current,
			isGlowing: inputValue.isGlowing === true,
			isWedged: inputValue.isWedged === true,
			cookingEffectMode: inputValue.cookingEffectMode || "none",
			cookingBlockEffect: inputValue.cookingBlockEffect || "none",
			locked: inputValue.locked === true && isCurrentInSuccessRange(current, currentValue),
		};
	}

	// 切替UIの操作中は入力値を保ったまま再描画できるよう、編集確定の対象外にします。
	function resolvePointerDownAction({ isOpen, containsTarget, isToggleTarget }) {
		return isOpen === true && containsTarget !== true && isToggleTarget !== true
			? "apply"
			: "none";
	}

	global.DQ10BoardCellEditor = {
		isCurrentInSuccessRange,
		normalizeEditValue,
		resolvePointerDownAction,
	};

	if (typeof module !== "undefined") {
		module.exports = global.DQ10BoardCellEditor;
	}
})(typeof window !== "undefined" ? window : globalThis);
