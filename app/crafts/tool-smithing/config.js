// 道具鍛冶固有の表示名、特技、初期マスを定義します。
registerDQ10Craft(createDQ10SmithingCraftConfig({
  id: "tool-smithing",
  label: "道具鍛冶",
  modeLabel: "Tool Smithing Settings",
  recipeLabel: "道具名",
  recipeCategoryLabel: "大項目",
  recipeSubcategoryLabel: "小項目",
  defaultRecipeName: "道具メモ",
  // 道具鍛冶の大項目は参照画像ディレクトリの道具種別と同期します。
  recipeCategoryOptions: [
    { id: "alchemy-pot", label: "ツボ" },
    { id: "smithing-hammer", label: "ハンマー" },
    { id: "frying-pan", label: "フライパン" },
    { id: "alchemy-lamp", label: "ランプ" },
    { id: "lure", label: "ルアー" },
    { id: "woodworking-knife", label: "木工刀" },
    { id: "material", label: "素材" },
    { id: "sewing-needle", label: "針" },
  ],
  techniques: [
    { id: "hit", name: "たたく", focusCost: 5, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1 },
    { id: "double", name: "2倍打ち", focusCost: 8, damageModel: "smithing-temperature", powerId: "power_2_0", multiplier: 2, criticalMultiplier: 2, criticalWeight: 0.9 },
    { id: "heat-up", name: "火力上げ", focusCost: 10, normalMin: 0, normalMax: 0, criticalMin: 0, criticalMax: 0, criticalWeight: 0.4 },
    { id: "aim", name: "ねらい打ち", focusCost: 16, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1.8 },
  ],
  items: [
    { id: "part-1", name: "上", gridCell: { row: 1, column: 1 }, current: 0, successMin: 70, successMax: 86 },
    { id: "part-2", name: "中", gridCell: { row: 2, column: 1 }, current: 0, successMin: 70, successMax: 86 },
    { id: "part-3", name: "下", gridCell: { row: 3, column: 1 }, current: 0, successMin: 70, successMax: 86 },
  ],
}));
