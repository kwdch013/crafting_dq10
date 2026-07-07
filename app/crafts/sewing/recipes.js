registerDQ10CraftRecipes("sewing", [
  {
    id: "sewing-needle-template",
    name: "針テンプレート",
    category: "針",
    categoryId: "sewing-needle",
    items: [
      { id: "part-1", name: "上", gridCell: { row: 1, column: 2 }, current: 0, target: 78, successMin: 78, successMax: 78 },
      { id: "part-2", name: "下", gridCell: { row: 2, column: 2 }, current: 0, target: 78, successMin: 78, successMax: 78 },
    ],
  },
]);
