const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// 鍛冶3職人の光地金を全マス一括で切り替えるボタンの検証です。
// BOARD操作領域は鍛冶では非表示のため、ボタンはコマンドパネル内に置きます。
const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

const commandPanelMatch = html.match(/<div class="cooking-command-panel" id="cookingCommandPanel" hidden>([\s\S]*?)<\/div>\s*<div class="smithing-board-trait-state"/);
assert.ok(commandPanelMatch, "コマンドパネルが存在すること");
const commandPanel = commandPanelMatch[1];

assert.match(
	commandPanel,
	/class="command-group smithing-only-command"/,
	"鍛冶専用のコマンドグループをコマンドパネル内に置いてください",
);
assert.match(
	commandPanel,
	/id="toggleSmithingLightButton"/,
	"光地金の一括切替ボタンを追加してください",
);

// 同期処理が鍛冶専用グループの表示と光地金特性による活性を制御することを確認します。
assert.match(mainJs, /smithingOnlyCommandGroups/, "鍛冶専用コマンドグループの参照を追加してください");
const syncStart = mainJs.indexOf("function syncBoardActionButtons");
const syncSource = mainJs.slice(syncStart, mainJs.indexOf("\n}\n", syncStart) + 2);
assert.match(
	syncSource,
	/smithingOnlyCommandGroups/,
	"syncBoardActionButtons で鍛冶専用グループの表示を切り替えてください",
);
assert.match(
	syncSource,
	/toggleSmithingLightButton/,
	"syncBoardActionButtons で一括切替ボタンの活性を制御してください",
);
assert.match(
	mainJs,
	/toggleSmithingLightButton\?\.addEventListener\("click"/,
	"一括切替ボタンのクリックで toggleSmithingLightAll を呼んでください",
);

// 鍛冶は配置替え不可でも履歴を積むため、戻る/進むを鍛冶でも使えることを確認します。
assert.match(
	mainJs,
	/function canUseBoardHistory/,
	"盤面履歴を使える職人の判定 (canUseBoardHistory) を実装してください",
);
assert.match(
	syncSource,
	/boardActions\.hidden = [^;]*isSmithing/s,
	"鍛冶でもBOARD操作領域 (戻る/進む) を表示してください",
);
assert.match(
	syncSource,
	/canUseBoardHistory\(\)/,
	"syncBoardActionButtons で履歴利用可否 (canUseBoardHistory) を参照してください",
);
assert.match(
	syncSource,
	/undoBoardButton\.disabled = !usesBoardHistory/,
	"戻るボタンの活性は履歴利用可否で判定してください",
);
assert.match(
	syncSource,
	/redoBoardButton\.disabled = !usesBoardHistory/,
	"進むボタンの活性は履歴利用可否で判定してください",
);

// 一括切替本体を抜き出して動作を検証します。
const toggleStart = mainJs.indexOf("function toggleSmithingLightAll");
assert.ok(toggleStart >= 0, "toggleSmithingLightAll を実装してください");
const toggleSource = mainJs.slice(toggleStart, mainJs.indexOf("\n}\n", toggleStart) + 2);

function runToggle(state, craftFamily = "smithing") {
	const calls = { history: 0, board: 0, analysis: 0, save: 0 };
	const context = {
		state,
		calls,
		isCurrentCraftFamily: (family) => family === craftFamily,
		pushBoardHistory: () => { calls.history += 1; },
		renderLayoutBoard: () => { calls.board += 1; },
		renderAnalysis: () => { calls.analysis += 1; },
		saveState: () => { calls.save += 1; },
	};
	vm.createContext(context);
	vm.runInContext(`${toggleSource}\ntoggleSmithingLightAll();`, context);
	return { state: context.state, calls };
}

{
	// 一部だけ光っている場合は全マスを光らせます。
	const { state, calls } = runToggle({
		traitId: "light",
		ingredients: [
			{ id: "a", isGlowing: true },
			{ id: "b", isGlowing: false },
			{ id: "c" },
		],
	});
	assert.deepEqual(state.ingredients.map((item) => item.isGlowing), [true, true, true]);
	assert.equal(calls.history, 1, "切替前に履歴を積んでください");
	assert.equal(calls.board, 1);
	assert.equal(calls.analysis, 1);
	assert.equal(calls.save, 1);
}

{
	// 全マスが光っている場合は全解除します。
	const { state } = runToggle({
		traitId: "light",
		ingredients: [
			{ id: "a", isGlowing: true },
			{ id: "b", isGlowing: true },
		],
	});
	assert.deepEqual(state.ingredients.map((item) => item.isGlowing), [false, false]);
}

{
	// 光地金特性でない場合は何もしません。
	const { state, calls } = runToggle({
		traitId: "double-half",
		ingredients: [{ id: "a", isGlowing: false }],
	});
	assert.equal(state.ingredients[0].isGlowing, false);
	assert.equal(calls.history, 0, "特性が光地金以外では履歴を積まないでください");
}

{
	// マスが無い場合は履歴を積みません。
	const { calls } = runToggle({
		traitId: "light",
		ingredients: [],
	});
	assert.equal(calls.history, 0, "空の盤面では履歴を積まないでください");
}

{
	// 鍛冶以外の職人では何もしません。
	const { state, calls } = runToggle(
		{
			traitId: "light",
			ingredients: [{ id: "a", isGlowing: false }],
		},
		"cooking",
	);
	assert.equal(state.ingredients[0].isGlowing, false);
	assert.equal(calls.history, 0, "鍛冶以外では履歴を積まないでください");
}

console.log("smithing-light-bulk-toggle: OK");
