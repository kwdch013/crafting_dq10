// 道具鍛冶固有の表示名、特技、初期マスを定義します。
function createToolSmithingTemplateItems(rows, columns, cells = null) {
  const items = [];
  const gridCells = Array.isArray(cells)
    ? cells
    : Array.from({ length: rows * columns }, (_, index) => ({
      row: Math.floor(index / columns) + 1,
      column: (index % columns) + 1,
    }));

  gridCells.forEach(({ row, column }) => {
    items.push({
      // マス名は占有マスの読み順(行→列)でA/B/C...を割り当てます。
      id: `part-${row}-${column}`,
      name: createDQ10ReadingOrderPositionName(gridCells, row, column),
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
    { id: "sewing-needle", label: "針", templateItems: createToolSmithingTemplateItems(2, 1) },
    { id: "woodworking-knife", label: "木工刀", templateItems: createToolSmithingTemplateItems(3, 1) },
    { id: "smithing-hammer", label: "ハンマー", templateItems: createToolSmithingTemplateItems(3, 2, [
      { row: 1, column: 1 },
      { row: 2, column: 1 },
      { row: 3, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 2 },
    ]) },
    { id: "alchemy-pot", label: "ツボ", templateItems: createToolSmithingTemplateItems(3, 2) },
    { id: "alchemy-lamp", label: "ランプ", templateItems: createToolSmithingTemplateItems(2, 2) },
    { id: "frying-pan", label: "フライパン", templateItems: createToolSmithingTemplateItems(4, 2) },
    { id: "lure", label: "ルアー", templateItems: createToolSmithingTemplateItems(2, 2, [
      { row: 1, column: 1 },
      { row: 2, column: 1 },
      { row: 1, column: 2 },
    ]) },
    { id: "material", label: "素材", templateItems: createToolSmithingTemplateItems(3, 2) },
  ],
  // 鍛冶の特技一覧は、画面で比較しやすいように倍率の低い順で並べます。
  techniques: [
    { id: "heat-up", name: "火力上げ", focusCost: 10, normalMin: 0, normalMax: 0, criticalMin: 0, criticalMax: 0, multiplier: 0, criticalWeight: 0.4 },
    { id: "hit", name: "たたく", focusCost: 5, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1 },
    { id: "aim", name: "ねらい打ち", focusCost: 16, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1.8 },
    { id: "double", name: "2倍打ち", focusCost: 8, damageModel: "smithing-temperature", powerId: "power_2_0", multiplier: 2, criticalMultiplier: 2, criticalWeight: 0.9 },
  ],
  items: [
    { id: "part-1", name: "A", gridCell: { row: 1, column: 1 }, current: 0, successMin: 70, successMax: 86 },
    { id: "part-2", name: "B", gridCell: { row: 2, column: 1 }, current: 0, successMin: 70, successMax: 86 },
    { id: "part-3", name: "C", gridCell: { row: 3, column: 1 }, current: 0, successMin: 70, successMax: 86 },
  ],
}));
