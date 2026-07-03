(function (global) {
  // 裁縫固有の画面差分を扱うコンポーネントを定義します。
  function createSewingComponent() {
    return {
      craftFamily: "sewing",
    };
  }

  global.registerDQ10CraftComponent("sewing", createSewingComponent());
})(window);
