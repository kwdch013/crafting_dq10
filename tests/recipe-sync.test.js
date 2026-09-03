const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const recipeSync = require("../app/recipe-sync.js");
const mainJs = fs.readFileSync("app/main.js", "utf8");

test("API側に存在するIDはPOSTせず、未登録レシピだけを置き換える", async () => {
	const created = [];
	const replaced = [];
	const imported = [];
	const result = await recipeSync.importLocalRecipes({
		craftIds: ["cooking"],
		getUserRecipes: () => [
			{ id: "db-1", name: "取込済み" },
			{ id: "user-1", name: "未取込" },
		],
		getApiRecipeIds: () => new Set(["db-1"]),
		createRecipe: async (craftId, recipe) => {
			created.push([craftId, recipe.id]);
			return { ...recipe, id: "db-2" };
		},
		replaceUserRecipe: (craftId, oldId, savedRecipe) => replaced.push([craftId, oldId, savedRecipe.id]),
		onImported: (craftId, oldId, newId) => imported.push([craftId, oldId, newId]),
	});

	assert.deepEqual(created, [["cooking", "user-1"]]);
	assert.deepEqual(replaced, [["cooking", "user-1", "db-2"]]);
	assert.deepEqual(imported, [["cooking", "user-1", "db-2"]]);
	assert.deepEqual([...result], [["user-1", "db-2"]]);
});

test("失敗したレシピを残し、他のレシピと職人の取り込みを続ける", async () => {
	const created = [];
	const replaced = [];
	const result = await recipeSync.importLocalRecipes({
		craftIds: ["cooking", "woodworking"],
		getUserRecipes: (craftId) => craftId === "cooking"
			? [{ id: "failed", name: "失敗" }, { id: "next", name: "続行" }]
			: [{ id: "other", name: "別職人" }],
		getApiRecipeIds: () => new Set(),
		createRecipe: async (craftId, recipe) => {
			created.push(`${craftId}:${recipe.id}`);
			if (recipe.id === "failed") throw new Error("recipe_name_already_exists");
			return { ...recipe, id: `db-${recipe.id}` };
		},
		replaceUserRecipe: (craftId, oldId) => replaced.push(`${craftId}:${oldId}`),
		onImported: () => {},
	});

	assert.deepEqual(created, ["cooking:failed", "cooking:next", "woodworking:other"]);
	assert.deepEqual(replaced, ["cooking:next", "woodworking:other"]);
	assert.equal(result.has("failed"), false);
	assert.deepEqual([...result], [["next", "db-next"], ["other", "db-other"]]);
});

test("POSTはsort_order競合を避けるため直列に実行する", async () => {
	const order = [];
	let active = 0;
	let maxActive = 0;
	await recipeSync.importLocalRecipes({
		craftIds: ["cooking"],
		getUserRecipes: () => [{ id: "first" }, { id: "second" }, { id: "third" }],
		getApiRecipeIds: () => new Set(),
		createRecipe: async (_craftId, recipe) => {
			order.push(`start:${recipe.id}`);
			active += 1;
			maxActive = Math.max(maxActive, active);
			await new Promise((resolve) => setTimeout(resolve, 1));
			active -= 1;
			order.push(`end:${recipe.id}`);
			return { ...recipe, id: `db-${recipe.id}` };
		},
		replaceUserRecipe: () => {},
		onImported: () => {},
	});

	assert.equal(maxActive, 1);
	assert.deepEqual(order, [
		"start:first", "end:first",
		"start:second", "end:second",
		"start:third", "end:third",
	]);
});

function extractFunction(name) {
	const functionStart = mainJs.indexOf(`function ${name}`);
	const asyncFunctionStart = mainJs.indexOf(`async function ${name}`);
	const start = asyncFunctionStart >= 0 ? asyncFunctionStart : functionStart;
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

const applyImportedRecipeIdsSource = extractFunction("applyImportedRecipeIds");
const initializeSource = extractFunction("initialize");

function createLocalStorage(initialValues = {}) {
	const values = new Map(Object.entries(initialValues));
	return {
		getItem(key) {
			return values.has(key) ? values.get(key) : null;
		},
		setItem(key, value) {
			values.set(key, value);
		},
		removeItem(key) {
			values.delete(key);
		},
	};
}

function runApplyImportedRecipeIds(localStorage, importedRecipeIds) {
	const context = vm.createContext({
		Map,
		localStorage,
		importedRecipeIds,
	});
	vm.runInContext(`
		const storageKey = "dq10-craft-support-mvp";
		${applyImportedRecipeIdsSource}
		applyImportedRecipeIds(importedRecipeIds);
	`, context);
}

test("取り込み済みレシピIDを正規化前に保存状態で読み替える", () => {
	const localStorage = createLocalStorage({
		"dq10-craft-support-mvp": JSON.stringify({
			recipeId: "user-tool-smithing-1",
			craftType: "tool-smithing",
		}),
	});

	runApplyImportedRecipeIds(
		localStorage,
		new Map([["user-tool-smithing-1", "db-9"]]),
	);

	assert.equal(
		JSON.parse(localStorage.getItem("dq10-craft-support-mvp")).recipeId,
		"db-9",
	);
});

test("対応表にないレシピIDの保存状態は書き換えない", () => {
	const savedState = JSON.stringify({ recipeId: "user-tool-smithing-1", craftType: "tool-smithing" });
	const localStorage = createLocalStorage({ "dq10-craft-support-mvp": savedState });

	runApplyImportedRecipeIds(localStorage, new Map([["user-other", "db-9"]]));

	assert.equal(localStorage.getItem("dq10-craft-support-mvp"), savedState);
});

test("保存状態がない場合や壊れたJSONでもレシピID読み替えは例外にしない", () => {
	assert.doesNotThrow(() => runApplyImportedRecipeIds(
		createLocalStorage(),
		new Map([["user-tool-smithing-1", "db-9"]]),
	));
	assert.doesNotThrow(() => runApplyImportedRecipeIds(
		createLocalStorage({ "dq10-craft-support-mvp": "{" }),
		new Map([["user-tool-smithing-1", "db-9"]]),
	));
});

async function runInitializeWithStoredRecipe(initializeImplementation) {
	const localStorage = createLocalStorage({
		"dq10-craft-support-mvp": JSON.stringify({
			recipeId: "user-tool-smithing-1",
			craftType: "tool-smithing",
		}),
	});
	const availableRecipeIds = new Set(["db-1", "db-9"]);
	const context = vm.createContext({
		Map,
		Promise,
		localStorage,
		state: null,
		apiHydratedCraftIds: new Set(["tool-smithing"]),
		hydrateRecipesFromApi: async () => {},
		getUserRecipes: () => [],
		getApiRecipeIds: () => new Set(),
		createRecipeOnApi: async () => ({}),
		replaceUserRecipe: () => {},
		render: () => {},
		window: {
			DQ10RecipeSync: {
				importLocalRecipes: async () => new Map([["user-tool-smithing-1", "db-9"]]),
			},
		},
		loadState: () => {
			const savedState = JSON.parse(localStorage.getItem("dq10-craft-support-mvp"));
			return {
				...savedState,
				recipeId: availableRecipeIds.has(savedState.recipeId) ? savedState.recipeId : "db-1",
			};
		},
	});

	vm.runInContext(`
		const storageKey = "dq10-craft-support-mvp";
		const apiBaseUrl = "http://localhost:8000";
		${applyImportedRecipeIdsSource}
		${initializeImplementation}
	`, context);
	await vm.runInContext("initialize()", context);
	return context.state;
}

test("initializeはloadStateの正規化より前に選択レシピIDを読み替える", async () => {
	const initializedState = await runInitializeWithStoredRecipe(initializeSource);

	assert.equal(initializedState.recipeId, "db-9");
});
