(function (global) {
  // 木工固有の画面差分を扱うコンポーネントを定義します。
  function createWoodworkingComponent() {
    return {
      craftFamily: "woodworking",
    };
  }

  global.registerDQ10CraftComponent("woodworking", createWoodworkingComponent());
})(window);
