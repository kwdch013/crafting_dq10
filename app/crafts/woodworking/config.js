// 木工の参照画像に合わせた固定基準値テンプレートを作成します。
function createWoodworkingTemplateItems(cells) {
  const names = {
    "1:2": "上",
    "2:2": "中央",
    "3:2": "下",
  };

  return cells.map(({ row, column }, index) => ({
    id: `part-${index + 1}`,
    name: names[`${row}:${column}`] || `${row}行${column}列`,
    optionId: "parallel",
    gridCell: { row, column },
    current: 0,
    target: 74,
    successMin: 74,
    successMax: 74,
  }));
}

registerDQ10Craft({
  id: "woodworking",
  label: "木工",
  modeLabel: "Woodworking Settings",
  recipeLabel: "装備名",
  recipeCategoryLabel: "大項目",
  recipeSubcategoryLabel: "装備名",
  itemNameLabel: "マス名",
  resourceLabel: "集中力",
  stateLabel: "状態",
  defaultRecipeName: "木工メモ",
  defaultFocus: 135,
  focus: createDQ10FocusConfig({
    defaultFocus: 135,
    defaultLevel: 80,
    defaultToolId: "woodworking-knife",
    defaultStars: 3,
    toolTypes: [{ id: "woodworking-knife", label: "木工刀" }],
  }),
  layout: {
    label: "木材配置",
    columns: 3,
    rows: 3,
    fixed: true,
  },
  itemOptions: [
    { id: "parallel", label: "並行" },
    { id: "vertical", label: "垂直" },
  ],
  // 木工の大項目は参照画像ファイル名と同期します。
  recipeCategoryOptions: [
    { id: "woodworking-knife", label: "木工刀", templateItems: createWoodworkingTemplateItems([
      { row: 1, column: 2 },
      { row: 2, column: 2 },
      { row: 3, column: 2 },
    ]) },
  ],
  techniquePreviewOptionId: "parallel",
  heatStates: [
    { id: "normal", label: "通常" },
  ],
  techniques: [
    { id: "cut", name: "けずる", focusCost: 5, damageModel: "woodworking-grain", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1 },
    { id: "double", name: "2倍削り", focusCost: 8, damageModel: "woodworking-grain", powerId: "normal", repeat: 2, multiplier: 2, criticalMultiplier: 2, criticalWeight: 0.9 },
    { id: "triple", name: "3倍削り", focusCost: 11, damageModel: "woodworking-grain", powerId: "normal", repeat: 3, multiplier: 3, criticalMultiplier: 2, criticalWeight: 0.85 },
    { id: "plane", name: "カンナがけ", focusCost: 6, damageModel: "woodworking-grain", powerId: "plane", multiplier: 0.4, criticalMultiplier: 2, criticalWeight: 0.8 },
    { id: "aim", name: "ねらい削り", focusCost: 16, damageModel: "woodworking-grain", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1.8 },
    { id: "rise", name: "昇竜彫り", focusCost: 7, damageModel: "woodworking-grain", powerId: "power_1_4", multiplier: 1.4, criticalMultiplier: 2, criticalWeight: 0.9 },
    { id: "river", name: "大河彫り", focusCost: 7, damageModel: "woodworking-grain", powerId: "power_1_4", multiplier: 1.4, criticalMultiplier: 2, criticalWeight: 0.9 },
  ],
  items: [
    { id: "part-1", name: "上", optionId: "parallel", gridCell: { row: 1, column: 2 }, current: 0, target: 74, successMin: 74, successMax: 74 },
    { id: "part-2", name: "中央", optionId: "parallel", gridCell: { row: 2, column: 2 }, current: 0, target: 74, successMin: 74, successMax: 74 },
    { id: "part-3", name: "下", optionId: "parallel", gridCell: { row: 3, column: 2 }, current: 0, target: 74, successMin: 74, successMax: 74 },
  ],
});
