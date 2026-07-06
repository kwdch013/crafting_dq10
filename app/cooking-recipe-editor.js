(function (global) {
	// レシピ編集で選べる調理食材分類を定義します。
	const ingredientOptions = [
		{ id: "", label: "未選択" },
		{ id: "肉", label: "肉" },
		{ id: "魚", label: "魚" },
		{ id: "野菜", label: "野菜" },
		{ id: "麺", label: "麺" },
		{ id: "卵", label: "卵" },
		{ id: "小麦", label: "小麦" },
	];

	// 2マス結合が必須の食材分類と許可する隣接方向を定義します。
	const pairedIngredientRules = {
		肉: {
			kindId: "meat",
			directionLabel: "左右",
			isPairedCell: (cell, otherCell) => cell.row === otherCell.row && Math.abs(cell.column - otherCell.column) === 1,
		},
		魚: {
			kindId: "fish",
			directionLabel: "上下",
			isPairedCell: (cell, otherCell) => cell.column === otherCell.column && Math.abs(cell.row - otherCell.row) === 1,
		},
	};

	function numberOr(value, fallback = 0) {
		const numberValue = Number(value);
		return Number.isFinite(numberValue) ? numberValue : fallback;
	}

	function normalizeCookingIngredientLabel(value) {
		const label = String(value || "").trim();

		if (label === "魚の切り身") {
			return "魚";
		}

		return ingredientOptions.some((option) => option.id === label) ? label : "";
	}

	function getCookingIngredientSelectOptions() {
		return ingredientOptions.map((option) => ({ ...option }));
	}

	function createGroupId(rule, firstCell) {
		return `${rule.kindId}-${numberOr(firstCell.row, 0)}-${numberOr(firstCell.column, 0)}`;
	}

	// 調理の結合食材は分類と隣接方向から保存用グループを決定します。
	function applyCookingIngredientGroups(items) {
		const normalizedItems = (items || []).map((item) => {
			const ingredientGroupLabel = normalizeCookingIngredientLabel(item?.ingredientGroupLabel);
			const nextItem = { ...item };
			delete nextItem.ingredientGroupId;
			delete nextItem.ingredientSize;

			if (ingredientGroupLabel) {
				nextItem.ingredientGroupLabel = ingredientGroupLabel;
			} else {
				delete nextItem.ingredientGroupLabel;
			}

			return nextItem;
		});
		const pairedIndexes = new Set();

		for (const [label, rule] of Object.entries(pairedIngredientRules)) {
			const candidates = normalizedItems
				.map((item, index) => ({ item, index, cell: item.gridCell || {} }))
				.filter((entry) => entry.item.ingredientGroupLabel === label);

			for (const entry of candidates) {
				if (pairedIndexes.has(entry.index)) {
					continue;
				}

				const pair = candidates.find((candidate) =>
					candidate.index !== entry.index &&
					!pairedIndexes.has(candidate.index) &&
					rule.isPairedCell(
						{ row: numberOr(entry.cell.row), column: numberOr(entry.cell.column) },
						{ row: numberOr(candidate.cell.row), column: numberOr(candidate.cell.column) },
					)
				);

				if (!pair) {
					return {
						valid: false,
						items: normalizedItems,
						message: `${label}は必ず2マスで結合します。食材分類で${label}を選ぶ場合は、${rule.directionLabel}に隣り合うマスも${label}にしてください。`,
					};
				}

				const orderedPair = [entry, pair].sort((a, b) =>
					numberOr(a.cell.row) - numberOr(b.cell.row) || numberOr(a.cell.column) - numberOr(b.cell.column)
				);
				const groupId = createGroupId(rule, orderedPair[0].cell);
				orderedPair.forEach((candidate) => {
					normalizedItems[candidate.index].ingredientGroupId = groupId;
					normalizedItems[candidate.index].ingredientSize = 2;
					pairedIndexes.add(candidate.index);
				});
			}
		}

		return {
			valid: true,
			items: normalizedItems,
			message: "",
		};
	}

	const api = {
		applyCookingIngredientGroups,
		getCookingIngredientSelectOptions,
		normalizeCookingIngredientLabel,
	};

	global.DQ10CookingRecipeEditor = api;

	if (typeof module !== "undefined" && module.exports) {
		module.exports = api;
	}
})(typeof window !== "undefined" ? window : globalThis);
