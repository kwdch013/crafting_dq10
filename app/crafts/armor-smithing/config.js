// 防具鍛冶固有の表示名、特技、初期マスを定義します。
registerDQ10Craft(createDQ10SmithingCraftConfig({
  id: "armor-smithing",
  label: "防具鍛冶",
  modeLabel: "Armor Smithing Settings",
  recipeLabel: "装備名",
  defaultRecipeName: "防具メモ",
  techniques: [
    { id: "hit", name: "たたく", focusCost: 5, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1 },
    { id: "top-bottom", name: "上下打ち", focusCost: 8, damageModel: "smithing-temperature", powerId: "power_1_2", multiplier: 1.2, criticalMultiplier: 2, criticalWeight: 0.95 },
    { id: "quad", name: "4連打ち", focusCost: 12, damageModel: "smithing-temperature", powerId: "power_1_2", multiplier: 1.2, criticalMultiplier: 2, criticalWeight: 0.9 },
    { id: "aim", name: "ねらい打ち", focusCost: 16, damageModel: "smithing-temperature", powerId: "normal", multiplier: 1, criticalMultiplier: 2, criticalWeight: 1.8 },
  ],
  items: [
    { id: "part-1", name: "左上", gridCell: { row: 1, column: 1 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-2", name: "右上", gridCell: { row: 1, column: 2 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-3", name: "左下", gridCell: { row: 2, column: 1 }, current: 0, successMin: 80, successMax: 95 },
    { id: "part-4", name: "右下", gridCell: { row: 2, column: 2 }, current: 0, successMin: 80, successMax: 95 },
  ],
}));
