(function (global) {
  // 調理の火力ラベルを参照表示用に定義します。
  const cookingHeatLabels = {
    normal: "通常",
    strong: "強火焼き",
    half: "弱火焼き",
  };

  // 調理固有の参照情報と盤面表示を扱うコンポーネントを作成します。
  function createCookingComponent() {
    return {
      craftFamily: "cooking",
      canRearrangeBoard,
      formatBlockEffectBadge,
      formatCellEffectBadge,
      formatIngredientVisual,
      formatLightToggle,
      getBlockEffectLabel: getCookingBlockEffectLabel,
      getCellEffect,
      getCellEffectLabel: getCookingCellEffectLabel,
      getIngredientSpecialState,
      getIngredientVisual,
      getIngredientVisualContext,
      isBoardCellEditable,
      renderReference,
      updateIngredientPositionOption,
    };
  }

  // フライパン固定配置の調理だけ盤面入れ替えを許可します。
  function canRearrangeBoard(config) {
    return Boolean(config?.layout?.fixed);
  }

  // 調理メモ欄へ特性と位置別ダメージを描画します。
  function renderReference({ config, state, elements, escapeHtml, getTrait }) {
    const cookingDamage = global.DQ10CookingDamage;
    if (!cookingDamage) {
      elements.craftReferencePanel.hidden = true;
      return;
    }

    elements.craftReferencePanel.hidden = false;
    renderRecipeTraitReference({ config, state, elements, escapeHtml, getTrait });
    renderCookingDamageRanges({ cookingDamage, elements, escapeHtml });
  }

  // 現在選択中の調理特性を参照欄に描画します。
  function renderRecipeTraitReference({ config, state, elements, escapeHtml, getTrait }) {
    const trait = getTrait(config, state.traitId);
    elements.recipeTraitReference.innerHTML = `
      <div class="reference-row trait-reference">
        <strong>${escapeHtml(trait?.label || "-")}</strong>
        <span>${escapeHtml(trait?.description || "-")}</span>
      </div>
    `;
  }

  // 位置別と光マスの火力ダメージを参照欄に描画します。
  function renderCookingDamageRanges({ cookingDamage, elements, escapeHtml }) {
    const positionRows = cookingDamage.positions.map((position) => {
      const ranges = ["normal", "strong", "half"].map((conditionId) => {
        const range = cookingDamage.getRange(position.id, conditionId);
        const values = cookingDamage.distributions?.[position.id]?.[conditionId] || range;
        return `${cookingHeatLabels[conditionId]} ${values ? values.join("/") : "-"}`;
      }).join(" / ");

      return `
        <div class="reference-row">
          <strong>${escapeHtml(position.label)}</strong>
          <span class="numeric">${escapeHtml(ranges)}</span>
        </div>
      `;
    });
    const specialRows = (cookingDamage.specialRanges || []).map((specialRange) => {
      const ranges = ["normal", "strong", "half"].map((conditionId) => {
        const values = cookingDamage.getSpecialValues?.(specialRange.id, conditionId);
        const range = cookingDamage.getSpecialRange
          ? cookingDamage.getSpecialRange(specialRange.id, conditionId)
          : specialRange.ranges?.[conditionId] || specialRange.range;
        return `${cookingHeatLabels[conditionId]} ${values ? values.join("/") : range ? `${range[0]}-${range[1]}` : "-"}`;
      }).join(" / ");

      return `
        <div class="reference-row">
          <strong>${escapeHtml(specialRange.label)}</strong>
          <span class="numeric">${escapeHtml(ranges)}</span>
          <small>光マスの火力別ダメージ幅</small>
        </div>
      `;
    });

    elements.cookingDamageRanges.innerHTML = [...positionRows, ...specialRows].join("");
  }

  // 調理特性に応じた光・戻り状態を返します。
  function getIngredientSpecialState(state, ingredient) {
    if (state.traitId === "light") {
      return {
        isGlowing: ingredient.isGlowing === true,
        isReturning: false,
      };
    }

    if (state.traitId === "light-return") {
      return {
        isGlowing: state.cookingEffectMode === "cross-glow" && ingredient.optionId === "cross",
        isReturning: state.cookingEffectMode === "corner-return" && ingredient.optionId === "corner",
      };
    }

    return {
      isGlowing: false,
      isReturning: false,
    };
  }

  // 指定マスに設定された焼き戻し効果を返します。
  function getCellEffect(state, row, column) {
    return (state.cookingCellEffects || []).find((effect) =>
      effect.row === row && effect.column === column,
    ) || null;
  }

  // 調理の右クリック編集が有効かどうかを返します。
  function isBoardCellEditable() {
    return true;
  }

  // 食材の封じ効果をバッジHTMLに整形します。
  function formatBlockEffectBadge(effectId, escapeHtml) {
    const label = getCookingBlockEffectLabel(effectId);
    return label ? `<span class="skill-effect-badge">${escapeHtml(label)}</span>` : "";
  }

  // マス効果をバッジHTMLに整形します。
  function formatCellEffectBadge(effect, escapeHtml) {
    const label = getCookingCellEffectLabel(effect?.effectId);
    return label ? `<span class="skill-effect-badge">${escapeHtml(label)}</span>` : "";
  }

  // 調理の食材画像をレシピと状態から解決します。
  function getIngredientVisual(ingredient, recipe) {
    return global.DQ10CookingIngredients?.getCookingIngredientVisual(ingredient, recipe) || null;
  }

  // 食材画像の推定に使うレシピ文脈を作成します。
  function getIngredientVisualContext(recipe, state) {
    return global.DQ10CookingIngredients?.getCookingIngredientVisualContext(recipe, state) || recipe || null;
  }

  // 食材画像を盤面セル内のHTMLに整形します。
  function formatIngredientVisual(visual, escapeHtml) {
    if (!visual) {
      return "";
    }

    const label = visual.isInferred ? `${visual.label}（推定）` : visual.label;

    return `
      <div class="board-cell-visual" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
        <img class="cooking-ingredient-image ${escapeHtml(visual.className)}" src="${escapeHtml(visual.src)}" alt="" />
      </div>
    `;
  }

  // 光特性で使う盤面上の切替ボタンを整形します。
  function formatLightToggle(state, item, special, escapeHtml) {
    if (state.traitId !== "light") {
      return "";
    }

    const label = special.isGlowing ? `${item.name}の光を解除` : `${item.name}を光らせる`;
    const activeClass = special.isGlowing ? " active" : "";

    return `
      <button class="board-light-toggle${activeClass}" type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
        光
      </button>
    `;
  }

  // 調理盤面の位置から食材の場所種別を同期します。
  function updateIngredientPositionOption(ingredient) {
    const optionId = getBoardOptionId(ingredient.gridCell?.row, ingredient.gridCell?.column);
    if (optionId) {
      ingredient.optionId = optionId;
    }
  }

  // フライパンの行列から中央・上下左右・四隅の種別を返します。
  function getBoardOptionId(row, column) {
    if (row === 2 && column === 2) {
      return "center";
    }

    if ((row === 2 && (column === 1 || column === 3)) || (column === 2 && (row === 1 || row === 3))) {
      return "cross";
    }

    return row && column ? "corner" : "";
  }

  // 食材の封じ効果ラベルを取得します。
  function getCookingBlockEffectLabel(effectId) {
    const effect = global.DQ10CookingEffects.cookingBlockEffects.find((candidate) => candidate.id === effectId);
    return effect?.label || "";
  }

  // マス効果ラベルを取得します。
  function getCookingCellEffectLabel(effectId) {
    const effect = global.DQ10CookingEffects.cookingCellEffects.find((candidate) => candidate.id === effectId);
    return effect?.label || "";
  }

  global.registerDQ10CraftComponent("cooking", createCookingComponent());
})(window);
