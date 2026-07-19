(function (global) {
  // 裁縫固有の画面差分を扱うコンポーネントを定義します。
  function createSewingComponent() {
    return {
      craftFamily: "sewing",
      applyHeatChange,
      // 裁縫BOARDでは右クリック編集で現在値と威力別判定を確認できます。
      isBoardCellEditable,
      renderPowerControls,
    };
  }

  // 裁縫の各マスは右クリック編集で現在値を変更できます。
  function isBoardCellEditable() {
    return true;
  }

  // ぬいパワー定義を単一の情報源として、BOARD用の切替ボタンを描画します。
  function renderPowerControls({ state, elements, onPowerChange }) {
    const container = elements.sewingPowerButtons;
    if (!container) {
      return;
    }

    container.replaceChildren();
    (global.DQ10SewingDamage?.powerStates || []).forEach((powerState) => {
      const button = global.document.createElement("button");
      const isActive = state.heat === powerState.id;
      button.type = "button";
      button.className = "button secondary sewing-power-button";
      button.dataset.sewingPowerId = powerState.id;
      button.value = powerState.id;
      button.textContent = powerState.label;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
      button.addEventListener("click", () => onPowerChange?.(powerState.id));
      container.append(button);
    });
  }

  // BOARDで選んだぬいパワーを計算状態と基本設定へ同期します。
  function applyHeatChange({ state, elements }, nextPowerId) {
    state.heat = nextPowerId;
    elements.heatInput.value = nextPowerId;
  }

  global.registerDQ10CraftComponent("sewing", createSewingComponent());
})(window);
