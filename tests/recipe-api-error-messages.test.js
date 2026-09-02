const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const mainJs = fs.readFileSync("app/main.js", "utf8");
const apiErrorBlockStart = mainJs.indexOf("const recipeApiErrorMessages");
const apiErrorBlockEnd = mainJs.indexOf("// API読込済みの職人ではAPI側優先", apiErrorBlockStart);

assert.notEqual(apiErrorBlockStart, -1, "APIエラー文言の対応表を定義してください");
assert.notEqual(apiErrorBlockEnd, -1, "APIエラー処理の範囲を特定できません");

function loadApiErrorFunctions(fetchImplementation) {
	const source = mainJs.slice(apiErrorBlockStart, apiErrorBlockEnd);
	return new Function(
		"apiBaseUrl",
		"fetch",
		`${source}\nreturn { persistRecipeToApi, deleteRecipeFromApi, getRecipeApiFailureMessage, recipeApiErrorMessages };`,
	)("http://api.example.test", fetchImplementation);
}

test("保存APIは400応答の識別子とステータスをErrorへ保持する", async () => {
	const { persistRecipeToApi } = loadApiErrorFunctions(async () => ({
		ok: false,
		status: 400,
		json: async () => ({ error: "recipe_name_already_exists" }),
	}));

	await assert.rejects(
		persistRecipeToApi("調理", { id: "recipe-1" }),
		(error) => error.status === 400 && error.apiErrorCode === "recipe_name_already_exists",
	);
});

test("壊れた本文の500応答でもステータスを保持して例外を返す", async () => {
	const { persistRecipeToApi } = loadApiErrorFunctions(async () => ({
		ok: false,
		status: 500,
		json: async () => {
			throw new SyntaxError("Unexpected token '<'");
		},
	}));

	await assert.rejects(
		persistRecipeToApi("調理", { id: "recipe-1" }),
		(error) => error.status === 500 && error.apiErrorCode === "",
	);
});

test("保存時は名前の重複が分かる文言を選ぶ", () => {
	const { getRecipeApiFailureMessage } = loadApiErrorFunctions(async () => ({ ok: true }));
	const message = getRecipeApiFailureMessage(
		{ status: 400, apiErrorCode: "recipe_name_already_exists" },
		"サーバーへの保存",
	);

	assert.match(message, /ブラウザには保存しましたが/);
	assert.match(message, /同じ職人に同じ名前のレシピ/);
	assert.match(message, /名前を変えて/);
});

test("5xxと通信失敗は従来どおりAPIの起動状態を案内する", () => {
	const { getRecipeApiFailureMessage } = loadApiErrorFunctions(async () => ({ ok: true }));

	assert.match(
		getRecipeApiFailureMessage({ status: 500, apiErrorCode: "internal_error" }, "サーバーへの保存"),
		/APIの起動状態を確認してください/,
	);
	assert.match(
		getRecipeApiFailureMessage(new TypeError("Failed to fetch"), "サーバーへの保存"),
		/APIの起動状態を確認してください/,
	);
});

test("削除APIでも識別子に応じて文言を分岐する", async () => {
	const { deleteRecipeFromApi, getRecipeApiFailureMessage } = loadApiErrorFunctions(async () => ({
		ok: false,
		status: 404,
		json: async () => ({ error: "not_found" }),
	}));

	await assert.rejects(
		deleteRecipeFromApi("調理", "recipe-1"),
		(error) => error.status === 404 && error.apiErrorCode === "not_found",
	);
	assert.match(
		getRecipeApiFailureMessage({ status: 404, apiErrorCode: "not_found" }, "サーバーからの削除"),
		/対象のレシピが見つかりません/,
	);
});

test("既知の識別子にはすべて専用文言があり、未知の4xxは識別子付きの既定文言になる", () => {
	const { getRecipeApiFailureMessage, recipeApiErrorMessages } = loadApiErrorFunctions(async () => ({ ok: true }));
	const errorCodes = [
		"recipe_name_already_exists",
		"recipe_id_belongs_to_other_craft",
		"recipe_cells_mismatch_category",
		"recipe_id_already_exists",
		"recipe_sort_order_conflict",
		"invalid_recipe_name",
		"invalid_recipe_items",
		"invalid_recipe_id",
		"invalid_recipe",
		"invalid_craft_id",
		"recipe_id_mismatch",
		"not_found",
		"internal_error",
	];

	for (const errorCode of errorCodes) {
		assert.equal(typeof recipeApiErrorMessages[errorCode], "string", `${errorCode} の文言を定義してください`);
		assert.notEqual(recipeApiErrorMessages[errorCode], "", `${errorCode} の文言を空にしないでください`);
	}
	assert.match(
		getRecipeApiFailureMessage({ status: 400, apiErrorCode: "unknown_error" }, "サーバーへの保存"),
		/unknown_error/,
	);
});
