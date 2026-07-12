// 武器鍛冶の種別ごとに、レシピ追加時の初期マスを定義します。
function createWeaponSmithingTemplateItems(rows, columns, cells = null) {
  const gridCells = Array.isArray(cells)
    ? cells
    : Array.from({ length: rows * columns }, (_, index) => ({
      row: Math.floor(index / columns) + 1,
      column: (index % columns) + 1,
    }));

  return gridCells.map(({ row, column }, index) => ({
    id: `part-${index + 1}`,
    // マス名は占有マスの読み順(行→列)でA/B/C...を割り当てます。
    name: createDQ10ReadingOrderPositionName(gridCells, row, column),
    gridCell: { row, column },
    current: 0,
    successMin: 80,
    successMax: 95,
  }));
}

// 武器鍛冶固有の表示名、特技、初期マスを定義します。
registerDQ10Craft(createDQ10SmithingCraftConfig({
  id: "weapon-smithing",
  label: "武器鍛冶",
  modeLabel: "Weapon Smithing Settings",
  recipeLabel: "武器名",
  recipeCategoryLabel: "大項目",
  recipeSubcategoryLabel: "武器名",
  defaultRecipeName: "武器メモ",
  // 武器鍛冶の大項目は参照画像の武器種別と同期し、実レシピは手動追加します。
  recipeCategoryOptions: [
    { id: "one-handed-sword", label: "片手剣", templateItems: createWeaponSmithingTemplateItems(3, 1) },
    { id: "two-handed-sword", label: "両手剣", templateItems: createWeaponSmithingTemplateItems(4, 2) },
    { id: "dagger", label: "短剣", templateItems: createWeaponSmithingTemplateItems(2, 1) },
    { id: "spear", label: "ヤリ", templateItems: createWeaponSmithingTemplateItems(4, 1) },
    { id: "axe", label: "オノ", templateItems: createWeaponSmithingTemplateItems(3, 2) },
    { id: "claw", label: "ツメ", templateItems: createWeaponSmithingTemplateItems(2, 2) },
    { id: "whip", label: "ムチ", templateItems: createWeaponSmithingTemplateItems(4, 2, [
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 1 },
      { row: 3, column: 2 },
      { row: 4, column: 1 },
    ]) },
    { id: "hammer", label: "ハンマー", templateItems: createWeaponSmithingTemplateItems(3, 2) },
    { id: "boomerang", label: "ブーメラン", templateItems: createWeaponSmithingTemplateItems(3, 2, [
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 1 },
    ]) },
    { id: "scythe", label: "鎌", templateItems: createWeaponSmithingTemplateItems(3, 2) },
  ],
  // 鍛冶の特技一覧は、画面で比較しやすいように倍率の低い順で並べます。
  techniques: [
    { id: "half", name: "半減打ち", focusCost: 6, damageModel: "smithing-temperature", powerId: "power_0_5", multiplier: 0.5, criticalMultiplier: 2, criticalWeight: 0.8 },
    { id: "hit", name: "たたく", focusCost: 5, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1 },
    { id: "aim", name: "ねらい打ち", focusCost: 16, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1.8 },
    { id: "double", name: "2倍打ち", focusCost: 8, damageModel: "smithing-temperature", powerId: "power_2_0", multiplier: 2, criticalMultiplier: 2, criticalWeight: 0.9 },
  ],
  items: [
    { id: "part-1", name: "A", gridCell: { row: 1, column: 1 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-2", name: "B", gridCell: { row: 2, column: 1 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-3", name: "C", gridCell: { row: 3, column: 1 }, current: 0, successMin: 80, successMax: 95 },
  ],
}));
