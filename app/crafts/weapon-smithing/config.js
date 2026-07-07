// 武器鍛冶固有の表示名、特技、初期マスを定義します。
registerDQ10Craft(createDQ10SmithingCraftConfig({
  id: "weapon-smithing",
  label: "武器鍛冶",
  modeLabel: "Weapon Smithing Settings",
  recipeLabel: "装備名",
  defaultRecipeName: "武器メモ",
  // 鍛冶の特技一覧は、画面で比較しやすいように倍率の低い順で並べます。
  techniques: [
    { id: "half", name: "半減打ち", focusCost: 6, damageModel: "smithing-temperature", powerId: "power_0_5", multiplier: 0.5, criticalMultiplier: 2, criticalWeight: 0.8 },
    { id: "hit", name: "たたく", focusCost: 5, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1 },
    { id: "aim", name: "ねらい打ち", focusCost: 16, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1.8 },
    { id: "double", name: "2倍打ち", focusCost: 8, damageModel: "smithing-temperature", powerId: "power_2_0", multiplier: 2, criticalMultiplier: 2, criticalWeight: 0.9 },
  ],
  items: [
    { id: "part-1", name: "上段", gridCell: { row: 1, column: 1 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-2", name: "中段", gridCell: { row: 2, column: 1 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-3", name: "下段", gridCell: { row: 3, column: 1 }, current: 0, successMin: 80, successMax: 95 },
  ],
}));
