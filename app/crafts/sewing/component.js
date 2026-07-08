(function (global) {
  // 裁縫固有の画面差分を扱うコンポーネントを定義します。
  function createSewingComponent() {
    return {
      craftFamily: "sewing",
      // 裁縫BOARDでは右クリック編集で現在値と威力別判定を確認できます。
      isBoardCellEditable,
    };
  }

  // 裁縫の各マスは右クリック編集で現在値を変更できます。
  function isBoardCellEditable() {
    return true;
  }

  global.registerDQ10CraftComponent("sewing", createSewingComponent());
})(window);
