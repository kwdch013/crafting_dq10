const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const mainJs = fs.readFileSync("app/main.js", "utf8");
const boardCellEditor = require("../app/board-cell-editor.js");

function extractFunction(name) {
	const start = mainJs.indexOf(`function ${name}`);
	assert.notEqual(start, -1, `${name} を実装してください`);
	const bodyStart = mainJs.indexOf("{", start);
	let depth = 0;

	for (let index = bodyStart; index < mainJs.length; index += 1) {
		if (mainJs[index] === "{") {
			depth += 1;
		} else if (mainJs[index] === "}") {
			depth -= 1;
			if (depth === 0) {
				return mainJs.slice(start, index + 1);
			}
		}
	}

	assert.fail(`${name} の終端を取得できませんでした`);
}

const historySources = [
	"createBoardSnapshot",
	"restoreBoardSnapshot",
	"pushBoardHistory",
	"undoBoardAction",
	"redoBoardAction",
].map(extractFunction).join("\n");

function createHistoryContext(state, additions = {}) {
	const context = {
		state,
		maxHistoryEntries: 50,
		normalizeCookingEffectMode: (_traitId, mode) => mode || "none",
		normalizeCookingCellEffects: (effects) => effects || [],
		normalizeSpecialChargeState: (specialState) => specialState || "inactive",
		getCurrentCraftConfig: () => ({ layout: { rows: 3, columns: 3 } }),
		renderLayoutBoard: () => {},
		renderSmithingDamageReference: () => {},
		renderCraftReference: () => {},
		renderAnalysis: () => {},
		saveState: () => {},
		syncBoardActionButtons: () => {},
		...additions,
	};
	vm.createContext(context);
	vm.runInContext(`
		let undoStack = [];
		let redoStack = [];
		let selectedBoardIngredientId = null;
		${historySources}
		this.getHistoryLengths = () => ({ undo: undoStack.length, redo: redoStack.length });
	`, context);
	return context;
}

{
	const context = {
		canRearrangeBoard: () => false,
		isCurrentCraftFamily: (family) => family === "woodworking",
	};
	vm.createContext(context);
	vm.runInContext(`${extractFunction("canUseBoardHistory")}\nthis.result = canUseBoardHistory();`, context);
	assert.equal(context.result, true, "木工でも盤面履歴を利用できるようにしてください");
}

{
	const state = {
		craftType: "woodworking",
		traitId: "none",
		ingredients: [
			{ id: "top", optionId: "horizontal", gridCell: { row: 1, column: 2 } },
		],
		cookingEffectMode: "none",
		cookingCellEffects: [],
		specialChargeState: "inactive",
		miracleGrillUsed: false,
		miracleGrillResult: "",
	};
	const component = {
		rotateGrain(currentState, direction) {
			assert.equal(direction, "right");
			currentState.ingredients[0].gridCell = { row: 2, column: 3 };
			currentState.ingredients[0].optionId = "vertical";
			return true;
		},
	};
	const context = createHistoryContext(state, {
		getCurrentCraftComponent: () => component,
		markCustomRecipe: () => {},
	});
	vm.runInContext(`${extractFunction("rotateWoodworkingGrain")}\nrotateWoodworkingGrain("right");`, context);

	assert.equal(context.state.ingredients[0].optionId, "vertical");
	assert.deepEqual({ ...context.state.ingredients[0].gridCell }, { row: 2, column: 3 });
	assert.deepEqual({ ...context.getHistoryLengths() }, { undo: 1, redo: 0 });

	vm.runInContext("undoBoardAction();", context);
	assert.equal(context.state.ingredients[0].optionId, "horizontal", "回転を取り消せること");
	assert.deepEqual({ ...context.state.ingredients[0].gridCell }, { row: 1, column: 2 });
	assert.deepEqual({ ...context.getHistoryLengths() }, { undo: 0, redo: 1 });

	vm.runInContext("redoBoardAction();", context);
	assert.equal(context.state.ingredients[0].optionId, "vertical", "回転をやり直せること");
	assert.deepEqual({ ...context.state.ingredients[0].gridCell }, { row: 2, column: 3 });
}

{
	const state = {
		craftType: "woodworking",
		traitId: "none",
		ingredients: [{
			id: "cell-1",
			current: 12,
			isGlowing: false,
			isWedged: false,
			locked: false,
			cookingBlockEffect: "none",
			gridCell: { row: 1, column: 1 },
		}],
		cookingEffectMode: "none",
		cookingCellEffects: [],
		specialChargeState: "inactive",
		miracleGrillUsed: false,
		miracleGrillResult: "",
	};
	const editor = {
		dataset: { id: "cell-1", row: "1", column: "1" },
		querySelector(selector) {
			return {
				".editor-current": { value: "12" },
				".editor-wedged": { checked: true },
				".editor-locked": { checked: false },
			}[selector];
		},
	};
	const context = createHistoryContext(state, {
		editor,
		numberOr: (value, fallback) => Number(value) || fallback,
		getCookingCellEffect: () => null,
		normalizeCookingCellEffect: (effectId) => effectId || "none",
		normalizeCookingBlockEffect: (effectId) => effectId || "none",
		DQ10BoardCellEditor: boardCellEditor,
		isCurrentCraftFamily: (family) => family === "woodworking",
		isSmithingLightHeatActive: () => false,
		updateCookingCellEffect: () => {},
		closeBoardCellEditor: () => {},
	});
	vm.runInContext(`${extractFunction("applyBoardCellEditor")}\napplyBoardCellEditor(editor);`, context);

	assert.equal(context.state.ingredients[0].isWedged, true);
	assert.deepEqual({ ...context.getHistoryLengths() }, { undo: 1, redo: 0 });

	vm.runInContext("undoBoardAction();", context);
	assert.equal(context.state.ingredients[0].isWedged, false, "くさび変更を取り消せること");

	vm.runInContext("redoBoardAction();", context);
	assert.equal(context.state.ingredients[0].isWedged, true, "くさび変更をやり直せること");
}

{
	const calls = { undo: 0, redo: 0 };
	const context = {
		canUseBoardHistory: () => true,
		undoBoardAction: () => { calls.undo += 1; },
		redoBoardAction: () => { calls.redo += 1; },
	};
	vm.createContext(context);
	vm.runInContext([
		extractFunction("isBoardHistoryShortcutTarget"),
		extractFunction("handleBoardHistoryShortcut"),
	].join("\n"), context);

	for (const target of [
		{ tagName: "INPUT" },
		{ tagName: "TEXTAREA" },
		{ tagName: "DIV", isContentEditable: true },
	]) {
		let prevented = false;
		context.handleBoardHistoryShortcut({
			key: "z",
			ctrlKey: true,
			shiftKey: false,
			target,
			preventDefault: () => { prevented = true; },
		});
		assert.equal(prevented, false, "テキスト編集対象の Ctrl+Z を横取りしないこと");
	}
	assert.deepEqual(calls, { undo: 0, redo: 0 });

	context.handleBoardHistoryShortcut({
		key: "z",
		ctrlKey: true,
		shiftKey: false,
		target: { tagName: "DIV", isContentEditable: false },
		preventDefault: () => {},
	});
	context.handleBoardHistoryShortcut({
		key: "z",
		ctrlKey: true,
		shiftKey: true,
		target: { tagName: "DIV", isContentEditable: false },
		preventDefault: () => {},
	});
	assert.deepEqual(calls, { undo: 1, redo: 1 }, "盤面上では Ctrl+Z / Ctrl+Shift+Z が動作すること");
}

console.log("woodworking-board-history: OK");
