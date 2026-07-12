(function (global) {
  // 木工固有の画面差分を扱うコンポーネントを定義します。
  function createWoodworkingComponent() {
    return {
      craftFamily: "woodworking",
      // 木工BOARDでは右クリック編集で現在値と威力別判定を確認できます。
      isBoardCellEditable,
      rotateGrain,
      getGrainVisual,
    };
  }

  // 木工の各マスは右クリック編集で現在値を変更できます。
  function isBoardCellEditable() {
    return true;
  }

  // 横(horizontal)を順目、縦(vertical)を逆目として木目方向を正規化します。
  function normalizeOrientation(optionId) {
    return optionId === "vertical" ? "vertical" : "horizontal";
  }

  // 90度回転で木目方向が入れ替わるため、横↔縦を反転します。
  function flipOrientation(optionId) {
    return normalizeOrientation(optionId) === "vertical" ? "horizontal" : "vertical";
  }

  // 木材を90度回転した時の盤面位置と、順目/逆目の反転を3x3グリッド上へ反映します。
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
      // 90度回転すると、そのマスの木目方向(順目/逆目)は必ず入れ替わります。
      const nextOptionId = flipOrientation(ingredient.optionId);
      changed = changed
        || nextCell.row !== row
        || nextCell.column !== column
        || nextOptionId !== ingredient.optionId;
      ingredient.gridCell = {
        ...(ingredient.gridCell || {}),
        row: nextCell.row,
        column: nextCell.column,
      };
      ingredient.optionId = nextOptionId;
    });

    return changed;
  }

  // 盤面セルの木目描画情報(順目/逆目の種別とパターン)を返します。
  // 順目=縦ストライプ、逆目=横ボーダーで、背景とアイコンの向きを一致させます。
  function getGrainVisual(item) {
    const orientation = normalizeOrientation(item?.optionId);
    const isParallel = orientation === "horizontal"; // 横木目=順目、縦木目=逆目
    return {
      orientation,
      grain: isParallel ? "parallel" : "against",
      grainLabel: isParallel ? "順目" : "逆目",
      patternClass: isParallel ? "grain-parallel" : "grain-against",
    };
  }

  global.registerDQ10CraftComponent("woodworking", createWoodworkingComponent());
})(window);
