(function (global) {
  // 職人ごとに取得した分類マスタを保持し、API停止時は未登録のままフォールバックへ戻します。
  const craftCategories = new Map();

  // API分類を既存の画面用分類へ変換し、既存の選択順とテンプレートを維持します。
  function mergeCategoryOptions(fallbackOptions, apiCategories) {
    // 通信失敗・非2xx応答・不正なペイロードでは通常setCraftCategoriesされず、配列でない値も取得失敗として扱います。
    // 空配列は200応答による正当な「分類なし」なので、フォールバックせずそのまま返します。
    if (!Array.isArray(apiCategories)) {
      return fallbackOptions;
    }

    const safeFallbackOptions = Array.isArray(fallbackOptions) ? fallbackOptions : [];
    // レシピ側の categoryId は legacyId 文字列のため、legacyId の無い分類を選択肢に出しても該当レシピが0件になる。
    // 未分類やDB移行時の変換用分類 (テンプレート) が該当する。DB由来の分類を画面へ出すのは、分類の新規作成を扱う段階3dの担当。
    const apiByLegacyId = new Map(
      apiCategories
        .filter((category) => category?.legacyId)
        .map((category) => [category.legacyId, category]),
    );

    // DBには表示順がないため、config.js の順序で既存分類を並べて既定選択と表示順を維持します。
    return safeFallbackOptions.flatMap((fallbackOption) => {
      const apiCategory = apiByLegacyId.get(fallbackOption.id);
      if (!apiCategory) {
        return [];
      }
      return [createCategoryOption(fallbackOption, apiCategory)];
    });
  }

  // API分類へ既存の画面専用設定を重ねます。config.jsに一致しないlegacyIdはテンプレート定義を持てないため、段階3bでは除外します。
  function createCategoryOption(fallbackOption, apiCategory) {
    return {
      ...fallbackOption,
      id: apiCategory.legacyId,
      label: apiCategory.name,
      categoryId: apiCategory.categoryId,
    };
  }

  // 指定職人のAPI分類を保持します。
  function setCraftCategories(craftId, apiCategories) {
    craftCategories.set(craftId, apiCategories);
  }

  // 取得済みならAPI分類を優先し、未取得時はconfig.jsのフォールバックを返します。
  function getCategoryOptions(craftId, fallbackOptions) {
    if (!craftCategories.has(craftId)) {
      return fallbackOptions;
    }
    return mergeCategoryOptions(fallbackOptions, craftCategories.get(craftId));
  }

  // 1職人の失敗で他職人のマスタ取得を止めないよう、取得処理を職人単位で完結させます。
  async function hydrateCraftCategories(apiBaseUrl, craftId, fetchImpl) {
    try {
      const baseUrl = String(apiBaseUrl || "").replace(/\/$/, "");
      const response = await fetchImpl(
        `${baseUrl}/api/crafts/${encodeURIComponent(craftId)}/masters`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      setCraftCategories(craftId, payload?.categories);
    } catch {
      // API停止時も config.js の分類で画面を継続します。
    }
  }

  // 全職人の分類マスタを並列に取得します。
  function hydrateFromApi({ apiBaseUrl, craftIds, fetchImpl = globalThis.fetch } = {}) {
    const targetCraftIds = Array.isArray(craftIds) ? craftIds : [];
    return Promise.all(targetCraftIds.map((craftId) =>
      hydrateCraftCategories(apiBaseUrl, craftId, fetchImpl)));
  }

  const api = {
    mergeCategoryOptions,
    setCraftCategories,
    getCategoryOptions,
    hydrateFromApi,
  };

  global.DQ10RecipeMasters = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
