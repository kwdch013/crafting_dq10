(function (global) {
  // 鍛冶3職人で共有する画面コンポーネントを定義します。
  const smithingComponent = {
    craftFamily: "smithing",
  };

  // 鍛冶3職人で共通する設定を職人別差分と結合します。
  function createDQ10SmithingCraftConfig(options) {
    return {
      recipeLabel: options.recipeLabel || "装備名",
      itemNameLabel: "マス名",
      resourceLabel: "集中力",
      stateLabel: "温度",
      targetMode: "random-in-range",
      defaultTraitId: "none",
      traits: [
        { id: "none", label: "なし", description: "通常の地金として扱います。" },
        { id: "light", label: "光地金", description: "温度が200の倍数の時だけ、選択したマスを光っている状態として扱います。" },
      ],
      focusNote: "Lv76-80はLv75以降を各レベル+2として置いた暫定値です。",
      defaultFocus: 247,
      focus: global.createDQ10FocusConfig({
        defaultFocus: 247,
        defaultLevel: 80,
        defaultToolId: "miracle-smithing-hammer",
        defaultStars: 3,
        levels: global.getDQ10FocusLevels("smithing"),
        toolTypes: global.getDQ10FocusToolTypes("smithingHammer"),
      }),
      layout: {
        label: "鍛冶配置",
        columns: 2,
        rows: 4,
        fixed: false,
      },
      heatStates: global.DQ10SmithingDamage.heatStates,
      // 鍛冶配置の各マスは右クリック編集で現在値と光地金状態を変更できます。
      isBoardCellEditable() {
        return true;
      },
      // 光地金の盤面表示は、現在温度が有効な時だけ光状態を返します。
      getIngredientSpecialState(state, ingredient) {
        const heat = Number(state?.heat);
        return {
          isGlowing: state?.traitId === "light" &&
            Number.isFinite(heat) &&
            heat % 200 === 0 &&
            ingredient?.isGlowing === true,
          isReturning: false,
        };
      },
      ...options,
    };
  }

  // 鍛冶3職人を同じ表示コンポーネントに紐づけます。
  ["weapon-smithing", "armor-smithing", "tool-smithing"].forEach((craftId) => {
    global.registerDQ10CraftComponent(craftId, smithingComponent);
  });

  global.createDQ10SmithingCraftConfig = createDQ10SmithingCraftConfig;
})(window);
