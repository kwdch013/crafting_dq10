(function (global) {
  // 裁縫固有の画面差分を扱うコンポーネントを定義します。
  function createSewingComponent() {
    return {
      craftFamily: "sewing",
      advancePower,
      applyHeatChange,
      getCellJudgementEntries,
      // 裁縫BOARDでは右クリック編集で現在値と威力別判定を確認できます。
      isBoardCellEditable,
      normalizeSavedState,
      renderPowerControls,
      toggleRegenerateCloth,
    };
  }

  // 裁縫の各マスは右クリック編集で現在値を変更できます。
  function isBoardCellEditable() {
    return true;
  }

  // ぬいパワー定義を単一の情報源として、BOARD用の切替ボタンを描画します。
  function renderPowerControls({ state, elements, onPowerChange }) {
    syncRegenerateClothButton(state, elements);
    renderNextPowerSelect(state, elements);
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

  // 次パワーは現在パワーと同じ定義を使い、未確定だけを末尾へ追加します。
  function renderNextPowerSelect(state, elements) {
    const select = elements.sewingNextPowerSelect;
    if (!select) {
      return;
    }

    select.replaceChildren();
    [...(global.DQ10SewingDamage?.powerStates || []), { id: "unknown", label: "?" }]
      .forEach((powerState) => {
        const option = global.document.createElement("option");
        option.value = powerState.id;
        option.textContent = powerState.label;
        select.append(option);
      });
    select.value = state.sewingNextHeat;
  }

  // BOARDで選んだぬいパワーを計算状態と基本設定へ同期します。
  function applyHeatChange({ state, elements }, nextPowerId) {
    state.heat = nextPowerId;
    elements.heatInput.value = nextPowerId;
  }

  // 未確定のターンはゲーム上のパワーを確定できないため、現在状態を維持します。
  function advancePower({ state, elements }) {
    const isKnownPower = (global.DQ10SewingDamage?.powerStates || [])
      .some(({ id }) => id === state.sewingNextHeat);
    if (!isKnownPower) {
      return false;
    }

    applyHeatChange({ state, elements }, state.sewingNextHeat);
    state.sewingNextHeat = "unknown";
    if (elements.sewingNextPowerSelect) {
      elements.sewingNextPowerSelect.value = "unknown";
    }
    return true;
  }

  // 旧版でぬいパワーとして保存された再生布を、独立した布状態へ移行します。
  function normalizeSavedState(value = {}) {
    const isLegacyRegenerate = value.heat === "regenerate";
    const nextPowerIds = (global.DQ10SewingDamage?.powerStates || []).map(({ id }) => id);
    const sewingNextHeat = [...nextPowerIds, "unknown"].includes(value.sewingNextHeat)
      ? value.sewingNextHeat
      : "unknown";
    return {
      ...value,
      heat: isLegacyRegenerate ? "normal" : value.heat,
      sewingNextHeat,
      sewingRegenerateCloth: isLegacyRegenerate || value.sewingRegenerateCloth === true,
    };
  }

  // 再生布はぬいパワーと独立しているため、専用ボタンだけで状態を切り替えます。
  function toggleRegenerateCloth({ state, elements }) {
    state.sewingRegenerateCloth = state.sewingRegenerateCloth !== true;
    syncRegenerateClothButton(state, elements);
  }

  function syncRegenerateClothButton(state, elements) {
    const button = elements.sewingRegenerateClothButton;
    if (!button) {
      return;
    }

    const isActive = state.sewingRegenerateCloth === true;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  // 通常特技は選択中のぬいパワー、再生行は再生専用分布として判定候補を作ります。
  function getCellJudgementEntries(state) {
    const sewingDamage = global.DQ10SewingDamage || {};
    const entries = Object.entries(sewingDamage.actions || {})
      .filter(([actionId]) => actionId !== "regenerate" && sewingDamage.getRange?.(state.heat || "normal", actionId))
      .sort(([, a], [, b]) => Math.abs(a.multiplier ?? 0) - Math.abs(b.multiplier ?? 0))
      .map(([actionId, action]) => ({
        id: actionId,
        label: action.label,
        // ほぐしぬいは実際のゲーム内で会心判定が存在しないため、判定候補からも除外します。
        ...(actionId === "loosen" ? { kind: "no-critical" } : {}),
        nextNormalRange: state.sewingNextHeat === "unknown"
          ? null
          : sewingDamage.getRange?.(state.sewingNextHeat, actionId) || null,
        technique: {
          damageModel: "sewing-power",
          actionId,
          criticalMultiplier: actionId === "loosen" ? 1 : (sewingDamage.criticalMultiplier || 2),
        },
      }));

    if (state.sewingRegenerateCloth === true && sewingDamage.getRange?.("regenerate", "regenerate")) {
      entries.push({
        id: "regenerate",
        label: sewingDamage.actions.regenerate.label,
        kind: "recovery",
        technique: {
          damageModel: "sewing-power",
          powerId: "regenerate",
          actionId: "regenerate",
          criticalMultiplier: 1,
        },
      });
    }

    return entries;
  }

  global.registerDQ10CraftComponent("sewing", createSewingComponent());
})(window);
