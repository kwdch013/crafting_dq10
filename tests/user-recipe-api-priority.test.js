const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// localStorage 保存のユーザーレシピはAPI側で修正済みの内容より古い場合があるため、
// API読込に成功した職人では同一idのレシピをAPI側優先で解決することを検証します (Issue #154)。
const mainJs = fs.readFileSync("app/main.js", "utf8");

function extractFunction(name) {
	const start = mainJs.indexOf(`function ${name}`);
	assert.ok(start >= 0, `${name} を実装してください`);
	const end = mainJs.indexOf("\n}\n", start) + 2;
	return mainJs.slice(start, end);
}

// API読込成功済み職人の記録先が宣言されていることを確認します。
assert.match(
	mainJs,
	/const apiHydratedCraftIds = new Set\(\)/,
	"API読込に成功した職人IDの記録先 (apiHydratedCraftIds) を宣言してください",
);

// hydrateRecipesFromApi が読込成功時に職人IDを記録していることを確認します。
const hydrateSource = extractFunction("hydrateRecipesFromApi");
assert.match(
	hydrateSource,
	/apiHydratedCraftIds\.add/,
	"hydrateRecipesFromApi で読込成功した職人IDを apiHydratedCraftIds へ記録してください",
);

const getAllSource = extractFunction("getAllCraftRecipes");

// getAllCraftRecipes を、依存をスタブ化した vm コンテキストで実行して挙動を検証します。
function buildRecipes({ hydratedCraftIds, baseRecipes, userRecipes, deletedIds }) {
	const context = {
		window: { DQ10CraftRecipes: { "tool-smithing": baseRecipes } },
		apiHydratedCraftIds: new Set(hydratedCraftIds),
		getDeletedRecipeIds: () => deletedIds || [],
		getUserRecipes: () => userRecipes,
		// マス名再計算は対象外のため素通しします。
		isSmithingCraftId: () => false,
		normalizeSmithingRecipeNodeNames: (recipe) => recipe,
		result: null,
	};
	vm.createContext(context);
	vm.runInContext(`${getAllSource}\nresult = getAllCraftRecipes("tool-smithing");`, context);
	return context.result;
}

const fixedBase = { id: "user-tool-smithing-1", name: "マデュライトルアー", items: [{ id: "a" }, { id: "b" }, { id: "c" }] };
const staleUser = { id: "user-tool-smithing-1", name: "マデュライトルアー", items: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }] };
const localOnly = { id: "user-tool-smithing-2", name: "ローカル限定レシピ", items: [] };

// API読込成功時: 同一idはAPI側 (修正済み3マス版) が優先されます。
{
	const recipes = buildRecipes({
		hydratedCraftIds: ["tool-smithing"],
		baseRecipes: [fixedBase],
		userRecipes: [staleUser, localOnly],
	});
	const lure = recipes.find((recipe) => recipe.id === "user-tool-smithing-1");
	assert.equal(lure.items.length, 3, "API読込成功時は同一idのレシピをAPI側優先にしてください");
	assert.ok(
		recipes.some((recipe) => recipe.id === "user-tool-smithing-2"),
		"API側に無いlocalStorageのみのレシピは引き続き表示してください",
	);
	assert.equal(recipes.length, 2, "同一idのレシピが重複しないようにしてください");
}

// API未読込 (フォールバック) 時: 従来どおりlocalStorage側が優先されます。
{
	const recipes = buildRecipes({
		hydratedCraftIds: [],
		baseRecipes: [fixedBase],
		userRecipes: [staleUser, localOnly],
	});
	const lure = recipes.find((recipe) => recipe.id === "user-tool-smithing-1");
	assert.equal(lure.items.length, 4, "API未読込時は従来どおりlocalStorage側を優先してください");
	assert.equal(recipes.length, 2, "同一idのレシピが重複しないようにしてください");
}

// deletedIds による除外は優先順位の変更後も維持されます。
{
	const recipes = buildRecipes({
		hydratedCraftIds: ["tool-smithing"],
		baseRecipes: [fixedBase],
		userRecipes: [staleUser, localOnly],
		deletedIds: ["user-tool-smithing-1"],
	});
	assert.ok(
		recipes.every((recipe) => recipe.id !== "user-tool-smithing-1"),
		"削除済みidのレシピはAPI側・localStorage側の双方から除外してください",
	);
}

// 保存直後のセッション内でも編集内容が表示されるよう、
// API読込済み職人ではメモリ上のAPI由来レシピを同一idで差し替えることを検証します。
const upsertSource = extractFunction("upsertHydratedCraftRecipe");

assert.match(
	extractFunction("saveManagedRecipe"),
	/upsertHydratedCraftRecipe/,
	"saveManagedRecipe で保存内容をメモリ上のAPI由来レシピへも反映してください",
);

function runUpsert({ hydratedCraftIds, baseRecipes, recipe }) {
	const context = {
		window: { DQ10CraftRecipes: { "tool-smithing": baseRecipes } },
		apiHydratedCraftIds: new Set(hydratedCraftIds),
	};
	vm.createContext(context);
	vm.runInContext(`${upsertSource}\nupsertHydratedCraftRecipe("tool-smithing", ${JSON.stringify(recipe)});`, context);
	return context.window.DQ10CraftRecipes["tool-smithing"];
}

const editedRecipe = { id: "user-tool-smithing-1", name: "マデュライトルアー", items: [{ id: "a" }] };

// API読込済み: 同一idのAPI由来レシピが編集内容へ差し替わります。
{
	const baseRecipes = runUpsert({
		hydratedCraftIds: ["tool-smithing"],
		baseRecipes: [fixedBase, { id: "base-2", name: "別レシピ" }],
		recipe: editedRecipe,
	});
	const lure = baseRecipes.find((recipe) => recipe.id === "user-tool-smithing-1");
	assert.equal(lure.items.length, 1, "保存した編集内容でAPI由来レシピを差し替えてください");
	assert.equal(baseRecipes.length, 2, "同一id以外のAPI由来レシピは維持してください");
}

// API未読込: メモリ上のレシピは変更しません (localStorage優先のため差し替え不要)。
{
	const baseRecipes = runUpsert({
		hydratedCraftIds: [],
		baseRecipes: [fixedBase],
		recipe: editedRecipe,
	});
	assert.equal(baseRecipes[0].items.length, 3, "API未読込の職人ではメモリ上のレシピを変更しないでください");
}

console.log("user-recipe-api-priority.test.js: ok");
