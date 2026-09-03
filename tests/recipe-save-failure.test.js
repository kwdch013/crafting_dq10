const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const mainJs = fs.readFileSync("app/main.js", "utf8");

function extractFunction(name) {
	const start = mainJs.indexOf(`async function ${name}`) >= 0
		? mainJs.indexOf(`async function ${name}`)
		: mainJs.indexOf(`function ${name}`);
	assert.notEqual(start, -1, `${name} を実装してください`);
	const bodyStart = mainJs.indexOf("{", start);
	let depth = 0;
	for (let index = bodyStart; index < mainJs.length; index += 1) {
		if (mainJs[index] === "{") depth += 1;
		if (mainJs[index] === "}") depth -= 1;
		if (depth === 0) return mainJs.slice(start, index + 1);
	}
	throw new Error(`${name} の末尾が見つかりません`);
}

const saveSource = extractFunction("saveManagedRecipe");
const deleteSource = extractFunction("deleteManagedRecipe");

function createSaveContext({ createRecipeOnApi, persistRecipeToApi }) {
	const calls = { close: 0, save: 0, upsert: 0, renderRecipeManager: 0, applyRecipe: 0, alerts: [] };
	const context = {
		managedRecipeEditId: "",
		managedRecipeCategoryId: "",
		state: { craftType: "cooking", recipeId: "old" },
		elements: {
			addRecipeFields: {
				querySelector: (selector) => ({
					"#addRecipeName": { value: "テスト料理" },
					"#addRecipeCategory": { value: "" },
					"#addRecipeTrait": { value: "" },
				}[selector]),
			},
			addRecipeDialog: { close: () => { calls.close += 1; } },
		},
		getManagedRecipeConfig: () => ({ id: "cooking" }),
		getAllCraftRecipes: () => [],
		collectAddRecipeItems: () => [{ id: "item-1" }],
		getRecipeCategoryLabel: () => "",
		normalizeTraitId: (_config, traitId) => traitId,
		loadUserRecipeStore: () => ({ recipes: {}, deletedIds: {} }),
		saveUserRecipeStore: () => { calls.save += 1; },
		createRecipeOnApi,
		persistRecipeToApi,
		upsertHydratedCraftRecipe: () => { calls.upsert += 1; },
		getRecipeApiFailureMessage: () => "保存に失敗しました",
		console: { warn: () => {} },
		alert: (message) => { calls.alerts.push(message); },
		renderRecipeManager: () => { calls.renderRecipeManager += 1; },
		applyRecipe: () => { calls.applyRecipe += 1; },
		calls,
	};
	vm.createContext(context);
	vm.runInContext(`${saveSource}\nresult = saveManagedRecipe({ preventDefault() {} });`, context);
	return context;
}

function createDeleteContext(deleteRecipeFromApi) {
	const calls = { save: 0, renderRecipeManager: 0, render: 0, alerts: [] };
	const store = { recipes: { cooking: [{ id: "db-1" }] }, deletedIds: {} };
	const context = {
		state: { craftType: "other", recipeId: "" },
		confirm: () => true,
		loadUserRecipeStore: () => store,
		saveUserRecipeStore: () => { calls.save += 1; },
		deleteRecipeFromApi,
		getRecipeApiFailureMessage: () => "削除に失敗しました",
		console: { warn: () => {} },
		alert: (message) => { calls.alerts.push(message); },
		clearBoardHistory: () => {},
		createDefaultState: () => ({}),
		renderRecipeManager: () => { calls.renderRecipeManager += 1; },
		render: () => { calls.render += 1; },
		calls,
		store,
	};
	vm.createContext(context);
	vm.runInContext(`${deleteSource}\nresult = deleteManagedRecipe("cooking", "db-1", "テスト料理");`, context);
	return context;
}

test("保存失敗時はダイアログもlocalStorage控えも更新しない", async () => {
	const context = createSaveContext({
		createRecipeOnApi: async () => { throw new Error("POST failed"); },
		persistRecipeToApi: async () => { throw new Error("PUT failed"); },
	});
	await context.result;
	assert.equal(context.calls.close, 0);
	assert.equal(context.calls.save, 0);
	assert.equal(context.calls.upsert, 0);
	assert.equal(context.calls.applyRecipe, 0);
	assert.equal(context.calls.alerts.length, 1);
});

test("保存成功時はサーバー発番レシピを控えと画面へ反映する", async () => {
	const context = createSaveContext({
		createRecipeOnApi: async () => ({ id: "db-1", name: "テスト料理", items: [{ id: "item-1" }] }),
		persistRecipeToApi: async () => { throw new Error("新規追加ではPUTしません"); },
	});
	await context.result;
	assert.equal(context.calls.close, 1);
	assert.equal(context.calls.save, 1);
	assert.equal(context.calls.upsert, 1);
	assert.equal(context.calls.applyRecipe, 1);
});

test("削除失敗時はlocalStorage控えと画面を更新しない", async () => {
	const context = createDeleteContext(async () => { throw new Error("DELETE failed"); });
	await context.result;
	assert.equal(context.calls.save, 0);
	assert.equal(context.calls.renderRecipeManager, 0);
	assert.equal(context.store.recipes.cooking.length, 1);
	assert.deepEqual(context.store.deletedIds, {});
	assert.equal(context.calls.alerts.length, 1);
});

test("削除成功時はlocalStorage控えと画面を更新する", async () => {
	const context = createDeleteContext(async () => {});
	await context.result;
	assert.equal(context.calls.save, 1);
	assert.equal(context.calls.renderRecipeManager, 1);
	assert.equal(context.calls.render, 1);
	assert.equal(context.store.recipes.cooking.length, 0);
	assert.deepEqual(Array.from(context.store.deletedIds.cooking), ["db-1"]);
});
