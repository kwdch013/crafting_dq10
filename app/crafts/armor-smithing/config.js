// 防具鍛冶の種別ごとに、レシピ追加時の初期マスを定義します。
function createArmorSmithingTemplateItems(rows, columns, cells = null) {
  const gridCells = Array.isArray(cells)
    ? cells
    : Array.from({ length: rows * columns }, (_, index) => ({
      row: Math.floor(index / columns) + 1,
      column: (index % columns) + 1,
    }));
  const verticalNames = {
    3: ["上", "中", "下"],
  };
  const matrixNames = {
    "1:1": "左上",
    "1:2": "右上",
    "2:1": rows === 2 ? "左下" : "左中",
    "2:2": rows === 2 ? "右下" : "右中",
    "3:1": rows === 3 ? "左下" : "左中下",
    "3:2": rows === 3 ? "右下" : "右中下",
    "4:1": "左下",
    "4:2": "右下",
  };

  return gridCells.map(({ row, column }, index) => ({
    id: `part-${index + 1}`,
    name: columns === 1
      ? verticalNames[rows]?.[row - 1] || `${row}行`
      : matrixNames[`${row}:${column}`] || `${row}行${column}列`,
    gridCell: { row, column },
    current: 0,
    successMin: 80,
    successMax: 95,
  }));
}

// 防具鍛冶固有の表示名、特技、初期マスを定義します。
registerDQ10Craft(createDQ10SmithingCraftConfig({
  id: "armor-smithing",
  label: "防具鍛冶",
  modeLabel: "Armor Smithing Settings",
  recipeLabel: "防具名",
  recipeCategoryLabel: "大項目",
  recipeSubcategoryLabel: "防具名",
  defaultRecipeName: "防具メモ",
  // 防具鍛冶の大項目は参照画像の防具部位と同期し、実レシピは手動追加します。
  recipeCategoryOptions: [
    { id: "shield", label: "盾", templateItems: createArmorSmithingTemplateItems(2, 2) },
    { id: "head", label: "アタマ", templateItems: createArmorSmithingTemplateItems(2, 2) },
    { id: "body-upper", label: "からだ上", templateItems: createArmorSmithingTemplateItems(3, 2) },
    { id: "body-lower", label: "からだ下", templateItems: createArmorSmithingTemplateItems(4, 2) },
    { id: "arm", label: "ウデ", templateItems: createArmorSmithingTemplateItems(3, 1) },
    { id: "foot", label: "足", templateItems: createArmorSmithingTemplateItems(2, 2) },
  ],
  // 鍛冶の特技一覧は、画面で比較しやすいように倍率の低い順で並べます。
  techniques: [
    { id: "hit", name: "たたく", focusCost: 5, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1 },
    { id: "aim", name: "ねらい打ち", focusCost: 16, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1.8 },
    { id: "top-bottom", name: "上下打ち", focusCost: 8, damageModel: "smithing-temperature", powerId: "power_1_2", multiplier: 1.2, criticalMultiplier: 2, criticalWeight: 0.95 },
    { id: "quad", name: "4連打ち", focusCost: 12, damageModel: "smithing-temperature", powerId: "power_1_2", multiplier: 1.2, criticalMultiplier: 2, criticalWeight: 0.9 },
  ],
  items: [
    { id: "part-1", name: "左上", gridCell: { row: 1, column: 1 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-2", name: "右上", gridCell: { row: 1, column: 2 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-3", name: "左下", gridCell: { row: 2, column: 1 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-4", name: "右下", gridCell: { row: 2, column: 2 }, current: 0, successMin: 80, successMax: 95 },
  ],
}));
