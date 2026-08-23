const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// 鍛冶職人のマス名は占有マスの読み順(A/B/C...)で一意に決まるため、
// 旧仕様で保存された「1行1列」などの名前を無視して再計算されることを検証します。
const mainJs = fs.readFileSync("app/main.js", "utf8");

// 再計算処理本体だけを抜き出して実行します。
const helperStart = mainJs.indexOf("function applySmithingReadingOrderNames");
assert.ok(helperStart >= 0, "applySmithingReadingOrderNames を実装してください");
const helperEnd = mainJs.indexOf("\n}\n", helperStart) + 2;
const helperSource = mainJs.slice(helperStart, helperEnd);

const context = { result: {} };
vm.createContext(context);

// registry.js のマス名生成をテスト側に用意し、実装と同じ採番規則で確認します。
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
	${helperSource}

	// ツボ(3行2列)を旧仕様の行列名で保存していた状態を模します。
	const staleItems = [
		{ id: "item-1", name: "1行1列", gridCell: { row: 1, column: 1 } },
		{ id: "item-2", name: "1行2列", gridCell: { row: 1, column: 2 } },
		{ id: "item-3", name: "2行1列", gridCell: { row: 2, column: 1 } },
		{ id: "item-4", name: "2行2列", gridCell: { row: 2, column: 2 } },
		{ id: "item-5", name: "3行1列", gridCell: { row: 3, column: 1 } },
		{ id: "item-6", name: "3行2列", gridCell: { row: 3, column: 2 } },
	];
	// vm実行結果の配列は別realm由来のため、文字列へ連結して比較します。
	result.recomputed = applySmithingReadingOrderNames(staleItems).map((item) => item.name).join(",");
	result.keepsOtherFields = applySmithingReadingOrderNames(staleItems)[2].id;
`, context);

assert.equal(
	context.result.recomputed,
	"A,B,C,D,E,F",
	"保存済みの行列表記を無視し、読み順のA/B/C...へ再計算してください",
);
assert.equal(
	context.result.keepsOtherFields,
	"item-3",
	"マス名以外のフィールドは保持してください",
);

console.log("smithing-node-name-normalization: OK");
