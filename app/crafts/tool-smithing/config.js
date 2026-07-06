// 道具鍛冶固有の表示名、特技、初期マスを定義します。
function createToolSmithingTemplateItems(rows, columns, cells = null) {
  const names = {
    "1:1": "左上",
    "1:2": "右上",
    "2:1": rows === 2 ? "左下" : "左中",
    "2:2": rows === 2 ? "右下" : "右中",
    "3:1": rows === 3 ? "左下" : "左中下",
    "3:2": rows === 3 ? "右下" : "右中下",
    "4:1": "左下",
    "4:2": "右下",
  };
  const items = [];
  const gridCells = Array.isArray(cells)
    ? cells
    : Array.from({ length: rows * columns }, (_, index) => ({
      row: Math.floor(index / columns) + 1,
      column: (index % columns) + 1,
    }));

  gridCells.forEach(({ row, column }) => {
    const singleColumnName = rows === 2
      ? row === 1 ? "上" : "下"
      : row === 1 ? "上" : row === rows ? "下" : "中";
    items.push({
      id: `part-${row}-${column}`,
      name: columns === 1 ? singleColumnName : names[`${row}:${column}`] || `${row}行${column}列`,
      gridCell: { row, column },
      current: 0,
      successMin: 70,
      successMax: 86,
    });
  });

  return items;
}

registerDQ10Craft(createDQ10SmithingCraftConfig({
  id: "tool-smithing",
  label: "道具鍛冶",
  modeLabel: "Tool Smithing Settings",
  recipeLabel: "道具名",
  recipeCategoryLabel: "大項目",
  recipeSubcategoryLabel: "道具名",
  defaultRecipeName: "道具メモ",
  // 道具鍛冶の大項目は参照画像ディレクトリの道具種別と同期します。
  recipeCategoryOptions: [
    { id: "alchemy-pot", label: "ツボ", templateItems: createToolSmithingTemplateItems(3, 2) },
    { id: "smithing-hammer", label: "ハンマー", templateItems: createToolSmithingTemplateItems(3, 2, [
      { row: 1, column: 1 },
      { row: 2, column: 1 },
      { row: 3, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 2 },
    ]) },
    { id: "frying-pan", label: "フライパン", templateItems: createToolSmithingTemplateItems(4, 2) },
    { id: "alchemy-lamp", label: "ランプ", templateItems: createToolSmithingTemplateItems(2, 2) },
    { id: "lure", label: "ルアー", templateItems: createToolSmithingTemplateItems(2, 2) },
    { id: "woodworking-knife", label: "木工刀", templateItems: createToolSmithingTemplateItems(3, 1) },
    { id: "material", label: "素材", templateItems: createToolSmithingTemplateItems(3, 2) },
    { id: "sewing-needle", label: "針", templateItems: createToolSmithingTemplateItems(2, 1) },
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
