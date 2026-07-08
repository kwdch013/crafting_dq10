(function (global) {
  // 木工固有の画面差分を扱うコンポーネントを定義します。
  function createWoodworkingComponent() {
    return {
      craftFamily: "woodworking",
      rotateGrain,
    };
  }

  // 木材を90度回転した時の盤面位置を、3x3グリッド上の座標変換として反映します。
  function rotateGrain(state, direction, layout) {
    if (!["left", "right"].includes(direction)) {
      return false;
    }

    const rows = Math.max(1, Number(layout?.rows) || 3);
    const columns = Math.max(1, Number(layout?.columns) || 3);
    let changed = false;
    (state?.ingredients || []).forEach((ingredient) => {
      const row = Number(ingredient.gridCell?.row);
      const column = Number(ingredient.gridCell?.column);
      if (!Number.isFinite(row) || !Number.isFinite(column)) {
        return;
      }

      const nextCell = direction === "right"
        ? { row: column, column: rows - row + 1 }
        : { row: columns - column + 1, column: row };
      changed = changed || nextCell.row !== row || nextCell.column !== column;
      ingredient.gridCell = {
        ...(ingredient.gridCell || {}),
        row: nextCell.row,
        column: nextCell.column,
      };
    });

    return changed;
  }

  global.registerDQ10CraftComponent("woodworking", createWoodworkingComponent());
})(window);
