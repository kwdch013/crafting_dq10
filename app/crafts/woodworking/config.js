// 設定単体で読み込まれるテストでも座標名を生成できるようにします。
function getWoodworkingPositionName(row, column) {
  if (typeof createDQ10CoordinatePositionName === "function") {
    return createDQ10CoordinatePositionName(row, column, 3);
  }

  return String.fromCharCode(64 + ((Number(row) - 1) * 3 + Number(column)));
}

// 木工の参照画像に合わせた固定基準値テンプレートを作成します。
// optionId で木目の初期向き(横=順目/縦=逆目)を指定できるようにします。
function createWoodworkingTemplateItems(cells, optionId = "horizontal") {
  return cells.map(({ row, column }, index) => ({
    id: `part-${index + 1}`,
    name: getWoodworkingPositionName(row, column),
    optionId,
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
  itemOptionLabel: "木目",
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
    { id: "horizontal", label: "横" },
    { id: "vertical", label: "縦" },
  ],
  // 木工の大項目は参照画像ファイル名と同期します。
  recipeCategoryOptions: [
    { id: "stick", label: "スティック", templateItems: createWoodworkingTemplateItems([
      { row: 1, column: 2 },
      { row: 2, column: 2 },
    ]) },
    { id: "staff", label: "杖", templateItems: createWoodworkingTemplateItems([
      { row: 1, column: 2 },
      { row: 2, column: 2 },
      { row: 3, column: 2 },
    ]) },
    { id: "kon", label: "昆", templateItems: createWoodworkingTemplateItems([
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 1 },
      { row: 3, column: 2 },
    ]) },
    { id: "fan", label: "扇", templateItems: createWoodworkingTemplateItems([
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
    ]) },
    { id: "bow", label: "弓", templateItems: createWoodworkingTemplateItems([
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 3, column: 1 },
      { row: 3, column: 2 },
    ]) },
    // 釣り竿は列2に縦(逆目)3マス、列1は行2-3の2マスを並べた計5マス形状です。
    { id: "fishing_rod", label: "釣り竿", templateItems: createWoodworkingTemplateItems([
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 1 },
      { row: 3, column: 2 },
    ], "vertical") },
  ],
  techniquePreviewOptionId: "horizontal",
  heatStates: [
    { id: "normal", label: "通常" },
  ],
  techniques: [
    { id: "cut", name: "けずる", focusCost: 5, damageModel: "woodworking-grain", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1 },
    { id: "double", name: "2倍削り", focusCost: 8, damageModel: "woodworking-grain", powerId: "power_2_0", multiplier: 2, criticalMultiplier: 2, criticalWeight: 0.9 },
    { id: "triple", name: "3倍削り", focusCost: 11, damageModel: "woodworking-grain", powerId: "power_3_0", multiplier: 3, criticalMultiplier: 2, criticalWeight: 0.85 },
    { id: "plane", name: "カンナがけ", focusCost: 6, damageModel: "woodworking-grain", powerId: "plane", multiplier: 0.4, criticalMultiplier: 2, criticalWeight: 0.8 },
    { id: "aim", name: "ねらい削り", focusCost: 16, damageModel: "woodworking-grain", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1.8 },
    { id: "rise", name: "昇竜彫り", focusCost: 7, damageModel: "woodworking-grain", powerId: "power_1_4", multiplier: 1.4, criticalMultiplier: 2, criticalWeight: 0.9 },
    { id: "river", name: "大河彫り", focusCost: 7, damageModel: "woodworking-grain", powerId: "power_1_4", multiplier: 1.4, criticalMultiplier: 2, criticalWeight: 0.9 },
  ],
  items: [
    { id: "part-1", name: "B", optionId: "horizontal", gridCell: { row: 1, column: 2 }, current: 0, target: 74, successMin: 74, successMax: 74 },
    { id: "part-2", name: "E", optionId: "horizontal", gridCell: { row: 2, column: 2 }, current: 0, target: 74, successMin: 74, successMax: 74 },
  ],
});
