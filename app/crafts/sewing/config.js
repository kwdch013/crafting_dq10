// 裁縫の参照画像に合わせた固定基準値テンプレートを作成します。
function createSewingTemplateItems(cells) {
  const names = {
    "1:1": "左上",
    "1:2": "上",
    "1:3": "右上",
    "2:1": "左下",
    "2:2": "下",
    "2:3": "右下",
    "3:1": "左下",
    "3:2": "下",
  };

  return cells.map(({ row, column }, index) => ({
    id: `part-${index + 1}`,
    name: names[`${row}:${column}`] || `${row}行${column}列`,
    gridCell: { row, column },
    current: 0,
    target: 78,
    successMin: 78,
    successMax: 78,
  }));
}

registerDQ10Craft({
  id: "sewing",
  label: "裁縫",
  modeLabel: "Sewing Settings",
  recipeLabel: "装備名",
  recipeCategoryLabel: "大項目",
  recipeSubcategoryLabel: "装備名",
  itemNameLabel: "マス名",
  resourceLabel: "集中力",
  stateLabel: "ぬいパワー",
  defaultRecipeName: "裁縫メモ",
  defaultFocus: 145,
  focus: createDQ10FocusConfig({
    defaultFocus: 145,
    defaultLevel: 80,
    defaultToolId: "sewing-needle",
    defaultStars: 3,
    toolTypes: [{ id: "sewing-needle", label: "さいほう針" }],
  }),
  layout: {
    label: "布配置",
    columns: 3,
    rows: 3,
    fixed: false,
  },
  // 裁縫の大項目は参照画像ファイル名と同期します。
  recipeCategoryOptions: [
    { id: "body-upper", label: "体上", templateItems: createSewingTemplateItems([
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 1, column: 3 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 2, column: 3 },
    ]) },
    { id: "body-lower", label: "体下", templateItems: createSewingTemplateItems([
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 1 },
      { row: 3, column: 2 },
    ]) },
    { id: "arm", label: "腕", templateItems: createSewingTemplateItems([
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 1, column: 3 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 2, column: 3 },
    ]) },
    { id: "foot", label: "足", templateItems: createSewingTemplateItems([
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
    ]) },
    { id: "head", label: "頭", templateItems: createSewingTemplateItems([
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 2, column: 3 },
    ]) },
  ],
  heatStates: DQ10SewingDamage.powerStates,
  techniques: [
    { id: "sew", name: "ぬう", focusCost: 5, damageModel: "sewing-power", actionId: "sew", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1 },
    { id: "half", name: "半かげんぬい", focusCost: 6, damageModel: "sewing-power", actionId: "half", multiplier: 0.5, criticalMultiplier: 2, criticalWeight: 0.8 },
    { id: "double", name: "2倍ぬい", focusCost: 8, damageModel: "sewing-power", actionId: "double", multiplier: 2, criticalMultiplier: 2, criticalWeight: 0.9 },
    { id: "triple", name: "3倍ぬい", focusCost: 12, damageModel: "sewing-power", actionId: "triple", multiplier: 3, criticalMultiplier: 2, criticalWeight: 0.85 },
    { id: "aim", name: "ねらいぬい", focusCost: 16, damageModel: "sewing-power", actionId: "sew", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1.8 },
    { id: "loosen", name: "ほぐしぬい", focusCost: 8, damageModel: "sewing-power", actionId: "loosen", multiplier: -1, criticalMultiplier: 1, criticalWeight: 0.6 },
    { id: "wind-center", name: "巻きこみ中心", focusCost: 10, damageModel: "sewing-power", actionId: "wind_center", multiplier: 1.5, criticalMultiplier: 2, criticalWeight: 0.8 },
    { id: "wind-around", name: "巻きこみ周り", focusCost: 10, damageModel: "sewing-power", actionId: "wind_around", multiplier: 0.75, criticalMultiplier: 2, criticalWeight: 0.8 },
  ],
  items: [
    { id: "part-1", name: "左上", gridCell: { row: 1, column: 1 }, current: 0, target: 78, successMin: 78, successMax: 78 },
    { id: "part-2", name: "上", gridCell: { row: 1, column: 2 }, current: 0, target: 78, successMin: 78, successMax: 78 },
    { id: "part-3", name: "右上", gridCell: { row: 1, column: 3 }, current: 0, target: 78, successMin: 78, successMax: 78 },
    { id: "part-4", name: "左下", gridCell: { row: 2, column: 1 }, current: 0, target: 78, successMin: 78, successMax: 78 },
    { id: "part-5", name: "下", gridCell: { row: 2, column: 2 }, current: 0, target: 78, successMin: 78, successMax: 78 },
    { id: "part-6", name: "右下", gridCell: { row: 2, column: 3 }, current: 0, target: 78, successMin: 78, successMax: 78 },
  ],
});
