(function (global) {
	const cookingBlockEffects = [
		{
			id: "half-seal",
			label: "半熟封じ",
			description: "4ターン、対象1マスの焼きダメージを半減します。小数点以下は繰り上げます。",
		},
		{
			id: "full-seal",
			label: "完熟封じ",
			description: "4ターン、対象1マスのダメージと回復を無効化します。",
		},
	];
	const cookingCellEffects = [
		{
			id: "heat-return",
			label: "焼き戻し",
			description: "4ターン、対象位置を焼かずに回復します。食材が移動しても位置に残ります。",
		},
	];
	const defaultEffectTurns = 4;

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

	function normalizeCookingBlockEffect(value) {
		return cookingBlockEffects.some((effect) => effect.id === value) ? value : "none";
	}

	function normalizeCookingCellEffect(value) {
		return cookingCellEffects.some((effect) => effect.id === value) ? value : "none";
	}

	function normalizeCookingCellEffects(value, layout = {}) {
		if (!Array.isArray(value)) {
			return [];
		}

		const rows = Number.isFinite(Number(layout.rows)) ? Number(layout.rows) : 3;
		const columns = Number.isFinite(Number(layout.columns)) ? Number(layout.columns) : 3;
		const byCell = new Map();

		value.forEach((entry) => {
			const row = Number(entry?.row);
			const column = Number(entry?.column);
			const effectId = normalizeCookingCellEffect(entry?.effectId);

			if (!Number.isInteger(row) || !Number.isInteger(column) || effectId === "none") {
				return;
			}

			if (row < 1 || row > rows || column < 1 || column > columns) {
				return;
			}

			byCell.set(`${row}:${column}`, {
				row,
				column,
				effectId,
				remainingTurns: Math.max(1, Number(entry?.remainingTurns) || defaultEffectTurns),
			});
		});

		return Array.from(byCell.values());
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

	function getCookingHeatButtonState(state) {
		const isCooking = state?.craftType === "cooking";

		return {
			normal: {
				hidden: !isCooking,
				disabled: false,
				active: isCooking && state.heat === "normal",
			},
			strong: {
				hidden: !isCooking,
				disabled: false,
				active: isCooking && state.heat === "strong",
			},
			half: {
				hidden: !isCooking,
				disabled: false,
				active: isCooking && state.heat === "half",
			},
		};
	}

	const api = {
		cookingBlockEffects,
		cookingCellEffects,
		clearCookingLight,
		defaultEffectTurns,
		getInitialCookingEffectMode,
		getCookingEffectButtonState,
		getCookingHeatButtonState,
		normalizeCookingBlockEffect,
		normalizeCookingCellEffect,
		normalizeCookingCellEffects,
		normalizeCookingEffectMode,
		normalizeSavedCookingEffectMode,
		toggleCookingLight,
	};

	global.DQ10CookingEffects = api;

	if (typeof module !== "undefined" && module.exports) {
		module.exports = api;
	}
})(typeof window !== "undefined" ? window : globalThis);
