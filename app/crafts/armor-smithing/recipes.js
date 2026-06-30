registerDQ10CraftRecipes("armor-smithing", [
  {
    id: "armor-2x2",
    name: "防具 2×2テンプレート",
    items: [
      { id: "part-1", name: "左上", gridCell: { row: 1, column: 1 }, current: 0, successMin: 80, successMax: 95 },
      { id: "part-2", name: "右上", gridCell: { row: 1, column: 2 }, current: 0, successMin: 80, successMax: 95 },
      { id: "part-3", name: "左下", gridCell: { row: 2, column: 1 }, current: 0, successMin: 80, successMax: 95 },
      { id: "part-4", name: "右下", gridCell: { row: 2, column: 2 }, current: 0, successMin: 80, successMax: 95 },
    ],
  },
  {
    id: "armor-2x3",
    name: "防具 2×3テンプレート",
    items: [
      { id: "part-1", name: "左上", gridCell: { row: 1, column: 1 }, current: 0, successMin: 80, successMax: 95 },
      { id: "part-2", name: "右上", gridCell: { row: 1, column: 2 }, current: 0, successMin: 80, successMax: 95 },
      { id: "part-3", name: "左中", gridCell: { row: 2, column: 1 }, current: 0, successMin: 80, successMax: 95 },
      { id: "part-4", name: "右中", gridCell: { row: 2, column: 2 }, current: 0, successMin: 80, successMax: 95 },
      { id: "part-5", name: "左下", gridCell: { row: 3, column: 1 }, current: 0, successMin: 80, successMax: 95 },
      { id: "part-6", name: "右下", gridCell: { row: 3, column: 2 }, current: 0, successMin: 80, successMax: 95 },
    ],
  },
]);
