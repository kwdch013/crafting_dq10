const assert = require("node:assert/strict");
const fs = require("node:fs");

const recipeMasters = require("../app/recipe-masters.js");

const fallbackOptions = [
	{ id: "first", label: "旧分類1", templateItems: [{ id: "A" }], extra: "保持する値" },
	{ id: "second", label: "旧分類2", templateItems: [{ id: "B" }] },
	{ id: "removed", label: "旧分類3", templateItems: [{ id: "C" }] },
];

const apiCategories = [
	{ categoryId: 20, legacyId: "second", name: "API分類2", cells: [] },
	{ categoryId: 0, legacyId: null, name: "未分類", cells: [] },
	{ categoryId: 10, legacyId: "first", name: "API分類1", cells: [] },
	{ categoryId: 5, legacyId: null, name: "テンプレート (縦3マス)", cells: [] },
	{ categoryId: 40, legacyId: "unexpected", name: "API追加分類", cells: [] },
];

{
	const merged = recipeMasters.mergeCategoryOptions(fallbackOptions, apiCategories);
	assert.deepEqual(
		JSON.parse(JSON.stringify(merged.map((category) => ({
			id: category.id,
			label: category.label,
			categoryId: category.categoryId,
		})))),
		[
			{ id: "first", label: "API分類1", categoryId: 10 },
			{ id: "second", label: "API分類2", categoryId: 20 },
		],
		"config.js の順序を保ち、config.jsにないlegacyIdの分類は除外してください",
	);
	assert.deepEqual(
		JSON.parse(JSON.stringify(merged[0].templateItems)),
		[{ id: "A" }],
		"一致する分類はフォールバックのテンプレートを引き継いでください",
	);
	assert.equal(merged[0].extra, "保持する値", "フォールバック固有の項目を引き継いでください");
	assert.equal(merged.some((category) => category.id === "removed"), false, "APIにない分類は除外してください");
	assert.equal(merged.some((category) => category.id === "unexpected"), false, "config.jsにないlegacyIdの分類は除外してください");
	assert.equal(merged.some((category) => category.categoryId === 0), false, "legacyIdのない未分類は選択肢から除外してください");
	assert.equal(
		merged.some((category) => category.categoryId === 5),
		false,
		"legacyIdのない変換用テンプレート分類は選択肢から除外してください",
	);
}

{
	assert.deepEqual(
		recipeMasters.mergeCategoryOptions(fallbackOptions, []),
		[],
		"200応答のAPI分類が空配列なら、分類なしとして空配列を返してください",
	);
	assert.strictEqual(
		recipeMasters.mergeCategoryOptions(fallbackOptions, null),
		fallbackOptions,
		"API分類が配列でなければフォールバックをそのまま返してください",
	);
}

{
	const craftId = "not-hydrated";
	assert.strictEqual(
		recipeMasters.getCategoryOptions(craftId, fallbackOptions),
		fallbackOptions,
		"未取得の職人ではフォールバックを返してください",
	);
}

function createResponse(status, payload = {}) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => payload,
	};
}

(async () => {
	const unavailableFallback = [{ id: "fallback", label: "フォールバック" }];
	await recipeMasters.hydrateFromApi({
		apiBaseUrl: "http://api.example.test",
		craftIds: ["service-unavailable", "fetch-failure"],
		fetchImpl: async (url) => {
			if (url.endsWith("/service-unavailable/masters")) {
				return createResponse(503);
			}
			throw new Error("network failure");
		},
	});
	assert.strictEqual(
		recipeMasters.getCategoryOptions("service-unavailable", unavailableFallback),
		unavailableFallback,
		"503時はフォールバックを維持してください",
	);
	assert.strictEqual(
		recipeMasters.getCategoryOptions("fetch-failure", unavailableFallback),
		unavailableFallback,
		"fetch例外時はフォールバックを維持してください",
	);

	await recipeMasters.hydrateFromApi({
		apiBaseUrl: "http://api.example.test/",
		craftIds: ["successful-craft", "empty-craft", "failed-craft"],
		fetchImpl: async (url) => {
			if (url.includes("successful-craft")) {
				return createResponse(200, {
					categories: [{ categoryId: 1, legacyId: "fallback", name: "API成功", cells: [] }],
				});
			}
			if (url.includes("empty-craft")) {
				return createResponse(200, { categories: [] });
			}
			throw new Error("network failure");
		},
	});
	assert.equal(
		recipeMasters.getCategoryOptions("successful-craft", unavailableFallback)[0].label,
		"API成功",
		"一職人が失敗しても、成功した職人の分類を保持してください",
	);
	assert.deepEqual(
		recipeMasters.getCategoryOptions("empty-craft", unavailableFallback),
		[],
		"200応答でcategoriesが空配列の職人は、フォールバックせず分類なしにしてください",
	);
	assert.strictEqual(
		recipeMasters.getCategoryOptions("failed-craft", unavailableFallback),
		unavailableFallback,
		"失敗した職人はフォールバックを維持してください",
	);

	const mainJs = fs.readFileSync("app/main.js", "utf8");
	assert.match(
		mainJs,
		/window\.DQ10RecipeMasters\?\.getCategoryOptions\(config\.id, configOptions\)/,
		"getRecipeCategoryOptions は DQ10RecipeMasters を経由してください",
	);
	assert.match(
		mainJs,
		/window\.DQ10RecipeMasters\?\.hydrateFromApi\(\{[\s\S]*?apiBaseUrl,[\s\S]*?craftIds: Object\.keys\(window\.DQ10CraftConfigs \|\| \{\}\)/,
		"初期化時に全職人のマスタを取得してください",
	);
	const indexHtml = fs.readFileSync("app/index.html", "utf8");
	assert.match(
		indexHtml,
		/<script src="\.\/recipe-masters\.js"><\/script>[\s\S]*?<script src="\.\/main\.js"><\/script>/,
		"recipe-masters.js は main.js より先に読み込んでください",
	);
})();
