const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// localStorage 保存のユーザーレシピには旧仕様の「1行1列」などのマス名が残るため、
// 鍛冶3職人ではレシピ読込時 (getAllCraftRecipes) に読み順のA/B/C...へ再計算されることを検証します。
const mainJs = fs.readFileSync("app/main.js", "utf8");

// 再計算ヘルパー本体を抜き出して実行します。
function extractFunction(name) {
	const start = mainJs.indexOf(`function ${name}`);
	assert.ok(start >= 0, `${name} を実装してください`);
	const end = mainJs.indexOf("\n}\n", start) + 2;
	return mainJs.slice(start, end);
}

const helperSource = extractFunction("normalizeSmithingRecipeNodeNames");
const guardSource = extractFunction("isSmithingCraftId");

// getAllCraftRecipes が鍛冶職人のレシピへ再計算を適用していることを確認します。
const getAllSource = extractFunction("getAllCraftRecipes");
assert.match(
	getAllSource,
	/normalizeSmithingRecipeNodeNames/,
	"getAllCraftRecipes でユーザーレシピのマス名を再計算してください",
);
assert.match(
	getAllSource,
	/isSmithingCraftId/,
	"再計算は鍛冶3職人に限定してください",
);

const context = { result: {} };
vm.createContext(context);

// registry.js と同じ採番規則をテスト側に用意します。
vm.runInContext(`
	function createDQ10CoordinatePositionName(row, column, columns) {
		let remaining = (Number(row) - 1) * Number(columns) + Number(column);
		let label = "";
		while (remaining > 0) {
			remaining -= 1;
			label = String.fromCharCode(65 + (remaining % 26)) + label;
			remaining = Math.floor(remaining / 26);
		}
		return label || "A";
	}
	function createDQ10ReadingOrderPositionName(cells, row, column) {
		const order = (cells || [])
			.map((cell) => ({ row: Number(cell.row), column: Number(cell.column) }))
			.filter((cell) => Number.isFinite(cell.row) && Number.isFinite(cell.column))
			.sort((a, b) => a.row - b.row || a.column - b.column);
		const index = order.findIndex((cell) => cell.row === Number(row) && cell.column === Number(column));
		return createDQ10CoordinatePositionName(1, (index < 0 ? 0 : index) + 1, 1);
	}
	${guardSource}
	${helperSource}

	// 旧仕様の行列名のまま保存されたユーザーレシピを模します (配列順は読み順と不一致)。
	const staleRecipe = {
		id: "user-tool-smithing-1",
		name: "旧仕様ルアー",
		items: [
			{ id: "item-1", name: "1行1列", gridCell: { row: 1, column: 1 }, successMin: 100, successMax: 110 },
			{ id: "item-2", name: "2行1列", gridCell: { row: 2, column: 1 }, successMin: 200, successMax: 210 },
			{ id: "item-3", name: "1行2列", gridCell: { row: 1, column: 2 }, successMin: 300, successMax: 310 },
			{ id: "note", name: "メモ" },
		],
	};
	const normalized = normalizeSmithingRecipeNodeNames(staleRecipe);
	result.names = normalized.items.map((item) => item.name).join(",");
	result.keepsFields = normalized.items[1].successMax;
	result.keepsId = normalized.items[2].id;
	result.originalUntouched = staleRecipe.items[0].name;
	result.smithingGuard = [
		isSmithingCraftId("weapon-smithing"),
		isSmithingCraftId("armor-smithing"),
		isSmithingCraftId("tool-smithing"),
		isSmithingCraftId("cooking"),
		isSmithingCraftId("woodworking"),
	].join(",");
`, context);

assert.equal(
	context.result.names,
	"A,C,B,メモ",
	"gridCellを持つマスは読み順A/B/C...へ再計算し、gridCellの無い項目は保存名を維持してください",
);
assert.equal(context.result.keepsFields, 210, "マス名以外のフィールドは保持してください");
assert.equal(context.result.keepsId, "item-3", "並び順とIDは変更しないでください");
assert.equal(context.result.originalUntouched, "1行1列", "元のレシピオブジェクトは書き換えないでください");
assert.equal(
	context.result.smithingGuard,
	"true,true,true,false,false",
	"鍛冶3職人だけを再計算対象にしてください",
);

console.log("smithing-user-recipe-node-name: OK");
