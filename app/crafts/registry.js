(function (global) {
  global.DQ10CraftConfigs = global.DQ10CraftConfigs || {};
  global.DQ10CraftRecipes = global.DQ10CraftRecipes || {};
  global.DQ10CraftComponents = global.DQ10CraftComponents || {};

  // 職人設定の責務を、UI/エンジン共通の設定と職人別差分へ分類します。
  const craftSettingSchema = {
    common: [
      "resourceLabel",
      "stateLabel",
      "targetMode",
      "defaultFocus",
      "focus",
      "focusNote",
      "layout",
      "heatStates",
      "techniquePreviewOptionId",
      "defaultHeatId",
      "allowCustomRecipes",
    ],
    individual: [
      "id",
      "label",
      "modeLabel",
      "recipeLabel",
      "recipeCategoryLabel",
      "recipeSubcategoryLabel",
      "recipeCategoryOptions",
      "itemNameLabel",
      "itemOptionLabel",
      "itemOptions",
      "defaultRecipeName",
      "defaultTraitId",
      "defaultTurns",
      "traits",
      "techniques",
      "items",
    ],
  };

  // 職人レベルごとの集中力基礎値を定義します。
  const focusLevelTables = {
    smithing: [
      { level: 1, focus: 50 },
      { level: 2, focus: 52 },
      { level: 3, focus: 53 },
      { level: 4, focus: 56 },
      { level: 5, focus: 57 },
      { level: 6, focus: 60 },
      { level: 7, focus: 61 },
      { level: 8, focus: 64 },
      { level: 9, focus: 67 },
      { level: 10, focus: 67 },
      { level: 11, focus: 70 },
      { level: 12, focus: 73 },
      { level: 13, focus: 73 },
      { level: 14, focus: 76 },
      { level: 15, focus: 79 },
      { level: 16, focus: 79 },
      { level: 17, focus: 82 },
      { level: 18, focus: 84 },
      { level: 19, focus: 87 },
      { level: 20, focus: 87 },
      { level: 21, focus: 90 },
      { level: 22, focus: 93 },
      { level: 23, focus: 93 },
      { level: 24, focus: 96 },
      { level: 25, focus: 98 },
      { level: 26, focus: 101 },
      { level: 27, focus: 101 },
      { level: 28, focus: 104 },
      { level: 29, focus: 109 },
      { level: 30, focus: 109 },
      { level: 31, focus: 112 },
      { level: 32, focus: 113 },
      { level: 33, focus: 113 },
      { level: 34, focus: 115 },
      { level: 35, focus: 119 },
      { level: 36, focus: 122 },
      { level: 37, focus: 123 },
      { level: 38, focus: 123 },
      { level: 39, focus: 125 },
      { level: 40, focus: 129 },
      { level: 41, focus: 132 },
      { level: 42, focus: 134 },
      { level: 43, focus: 137 },
      { level: 44, focus: 139 },
      { level: 45, focus: 139 },
      { level: 46, focus: 142 },
      { level: 47, focus: 142 },
      { level: 48, focus: 144 },
      { level: 49, focus: 147 },
      { level: 50, focus: 149 },
      { level: 51, focus: 152 },
      { level: 52, focus: 152 },
      { level: 53, focus: 154 },
      { level: 54, focus: 157 },
      { level: 55, focus: 159 },
      { level: 56, focus: 162 },
      { level: 57, focus: 162 },
      { level: 58, focus: 164 },
      { level: 59, focus: 167 },
      { level: 60, focus: 169 },
      { level: 61, focus: 171 },
      { level: 62, focus: 171 },
      { level: 63, focus: 173 },
      { level: 64, focus: 175 },
      { level: 65, focus: 177 },
      { level: 66, focus: 180 },
      { level: 67, focus: 182 },
      { level: 68, focus: 184 },
      { level: 69, focus: 186 },
      { level: 70, focus: 188 },
      { level: 71, focus: 189 },
      { level: 72, focus: 191 },
      { level: 73, focus: 193 },
      { level: 74, focus: 195 },
      { level: 75, focus: 197 },
      { level: 76, focus: 199, provisional: true },
      { level: 77, focus: 201, provisional: true },
      { level: 78, focus: 203, provisional: true },
      { level: 79, focus: 205, provisional: true },
      { level: 80, focus: 208, provisional: true },
    ],
    cooking: [
      { level: 1, focus: 50 },
      { level: 2, focus: 52 },
      { level: 3, focus: 55 },
      { level: 4, focus: 56 },
      { level: 5, focus: 58 },
      { level: 6, focus: 60 },
      { level: 7, focus: 61 },
      { level: 8, focus: 64 },
      { level: 9, focus: 67 },
      { level: 10, focus: 67 },
      { level: 11, focus: 70 },
      { level: 12, focus: 71 },
      { level: 13, focus: 73 },
      { level: 14, focus: 76 },
      { level: 15, focus: 76 },
      { level: 16, focus: 79 },
      { level: 17, focus: 82 },
      { level: 18, focus: 84 },
      { level: 19, focus: 87 },
      { level: 20, focus: 87 },
      { level: 21, focus: 90 },
      { level: 22, focus: 94 },
      { level: 23, focus: 94 },
      { level: 24, focus: 96 },
      { level: 25, focus: 98 },
      { level: 26, focus: 101 },
      { level: 27, focus: 101 },
      { level: 28, focus: 104 },
      { level: 29, focus: 109 },
      { level: 30, focus: 109 },
      { level: 31, focus: 112 },
      { level: 32, focus: 113 },
      { level: 33, focus: 113 },
      { level: 34, focus: 115 },
      { level: 35, focus: 119 },
      { level: 36, focus: 122 },
      { level: 37, focus: 122 },
      { level: 38, focus: 123 },
      { level: 39, focus: 125 },
      { level: 40, focus: 129 },
      { level: 41, focus: 132 },
      { level: 42, focus: 134 },
      { level: 43, focus: 136 },
      { level: 44, focus: 139 },
      { level: 45, focus: 139 },
      { level: 46, focus: 142 },
      { level: 47, focus: 142 },
      { level: 48, focus: 144 },
      { level: 49, focus: 147 },
      { level: 50, focus: 149 },
      { level: 51, focus: 152 },
      { level: 52, focus: 152 },
      { level: 53, focus: 154 },
      { level: 54, focus: 157 },
      { level: 55, focus: 159 },
      { level: 56, focus: 162 },
      { level: 57, focus: 162 },
      { level: 58, focus: 164 },
      { level: 59, focus: 167 },
      { level: 60, focus: 169 },
      { level: 61, focus: 171 },
      { level: 62, focus: 171 },
      { level: 63, focus: 173 },
      { level: 64, focus: 175 },
      { level: 65, focus: 177 },
      { level: 66, focus: 180 },
      { level: 67, focus: 182 },
      { level: 68, focus: 184 },
      { level: 69, focus: 186 },
      { level: 70, focus: 188 },
      { level: 71, focus: 189 },
      { level: 72, focus: 191 },
      { level: 73, focus: 193 },
      { level: 74, focus: 195 },
      { level: 75, focus: 197 },
      { level: 76, focus: 199, provisional: true },
      { level: 77, focus: 201, provisional: true },
      { level: 78, focus: 203, provisional: true },
      { level: 79, focus: 205, provisional: true },
      { level: 80, focus: 207, provisional: true },
    ],
  };

  // 道具種別ごとの集中力加算値を定義します。
  const focusToolTypes = {
    smithingHammer: [
      { id: "copper-smithing-hammer", label: "銅の鍛冶ハンマー", focusBonus: 0 },
      { id: "iron-smithing-hammer", label: "鉄の鍛冶ハンマー", focusBonus: 10 },
      { id: "silver-smithing-hammer", label: "銀の鍛冶ハンマー", focusBonus: 15 },
      { id: "platinum-smithing-hammer", label: "プラチナ鍛冶ハンマー", focusBonus: 25 },
      { id: "super-smithing-hammer", label: "超鍛冶ハンマー", focusBonus: 35 },
      { id: "miracle-smithing-hammer", label: "奇跡の鍛冶ハンマー", focusBonus: 50 },
      { id: "light-smithing-hammer", label: "光の鍛冶ハンマー", focusBonus: 45 },
    ],
    fryingPan: [
      { id: "copper-frying-pan", label: "銅のフライパン", focusBonus: 0 },
      { id: "iron-frying-pan", label: "鉄のフライパン", focusBonus: 10 },
      { id: "silver-frying-pan", label: "銀のフライパン", focusBonus: 15 },
      { id: "platinum-frying-pan", label: "プラチナフライパン", focusBonus: 25 },
      { id: "super-frying-pan", label: "超フライパン", focusBonus: 35 },
      { id: "miracle-frying-pan", label: "奇跡のフライパン", focusBonus: 50 },
      { id: "light-frying-pan", label: "光のフライパン", focusBonus: 45 },
    ],
  };

  // 職人設定をグローバルレジストリへ登録します。
  global.registerDQ10Craft = function registerDQ10Craft(config) {
    if (!config || !config.id) {
      throw new Error("Craft config requires an id.");
    }

    config.settingGroups = global.classifyDQ10CraftConfig(config);
    global.DQ10CraftConfigs[config.id] = config;
  };

  // 設定キーを分類し、未分類キーをテストで検出できる形にします。
  global.classifyDQ10CraftConfig = function classifyDQ10CraftConfig(config) {
    const common = new Set(craftSettingSchema.common);
    const individual = new Set(craftSettingSchema.individual);
    const entries = Object.keys(config).filter((key) => key !== "settingGroups");

    return {
      common: entries.filter((key) => common.has(key)),
      individual: entries.filter((key) => individual.has(key)),
      unknown: entries.filter((key) => !common.has(key) && !individual.has(key)),
    };
  };

  global.DQ10CraftSettingSchema = {
    common: [...craftSettingSchema.common],
    individual: [...craftSettingSchema.individual],
  };

  // API停止時フォールバック用のレシピ一覧を登録します。
  global.registerDQ10CraftRecipes = function registerDQ10CraftRecipes(craftId, recipes) {
    if (!craftId || !Array.isArray(recipes)) {
      throw new Error("Craft recipes require a craft id and recipe array.");
    }

    global.DQ10CraftRecipes[craftId] = recipes;
  };

  // 空白マスも含めた左上からの座標順をA/B/C...の表示名に変換します。
  global.createDQ10CoordinatePositionName = function createDQ10CoordinatePositionName(row, column, columns) {
    const rowNumber = Number(row);
    const columnNumber = Number(column);
    const columnCount = Number(columns);
    let remaining = (rowNumber - 1) * columnCount + columnNumber;
    let label = "";

    while (remaining > 0) {
      remaining -= 1;
      label = String.fromCharCode(65 + (remaining % 26)) + label;
      remaining = Math.floor(remaining / 26);
    }

    return label || "A";
  };

  // 職人ごとの画面差分を扱うコンポーネントを登録します。
  global.registerDQ10CraftComponent = function registerDQ10CraftComponent(craftId, component) {
    if (!craftId || !component || typeof component !== "object") {
      throw new Error("Craft component requires a craft id and component object.");
    }

    global.DQ10CraftComponents[craftId] = component;
  };

  // 未定義の職人では空の共通コンポーネントを返します。
  global.getDQ10CraftComponent = function getDQ10CraftComponent(craftId) {
    return global.DQ10CraftComponents[craftId] || {};
  };

  // 集中力テーブルを呼び出し元で変更できないよう複製して返します。
  global.getDQ10FocusLevels = function getDQ10FocusLevels(kind) {
    return (focusLevelTables[kind] || []).map((entry) => ({ ...entry }));
  };

  // 道具種別テーブルを呼び出し元で変更できないよう複製して返します。
  global.getDQ10FocusToolTypes = function getDQ10FocusToolTypes(kind) {
    return (focusToolTypes[kind] || []).map((toolType) => ({ ...toolType }));
  };

  // レベル、道具、星数から集中力設定を組み立てます。
  global.createDQ10FocusConfig = function createDQ10FocusConfig(options) {
    const stars = options.stars || [0, 1, 2, 3];

    return {
      defaultLevel: options.defaultLevel,
      defaultToolId: options.defaultToolId,
      defaultStars: options.defaultStars ?? 0,
      levels: options.levels || [{ level: options.defaultLevel, focus: options.defaultFocus }],
      tools: options.toolTypes.map((toolType) => ({
        id: toolType.id,
        label: toolType.label,
        focusBonusByStars: stars.reduce((result, star) => {
          result[star] = toolType.focusBonusByStars?.[star] ?? toolType.focusBonus ?? 0;
          return result;
        }, {}),
      })),
      stars,
    };
  };
})(window);
