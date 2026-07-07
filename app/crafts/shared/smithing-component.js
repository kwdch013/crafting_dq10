(function (global) {
  // 鍛冶3職人で共有する画面コンポーネントを定義します。
  const smithingComponent = {
    craftFamily: "smithing",
    applyHeatChange,
    canEditLightState,
    getDamagePowerEntries: getSmithingDamagePowerEntries,
    getNextHeat,
    // 鍛冶配置の各マスは右クリック編集で現在値と光地金状態を変更できます。
    isBoardCellEditable() {
      return true;
    },
    isLightHeatActive,
    renderBoardReference,
    renderTemperatureSelect,
    // 光地金の盤面表示は、現在温度が有効な時だけ光状態を返します。
    getIngredientSpecialState(state, ingredient) {
      return {
        isGlowing: isLightHeatActive(state) && ingredient?.isGlowing === true,
        isReturning: global.DQ10CraftEngine?.isSmithingReturnNextTurn?.(state) === true,
      };
    },
    // 光地金は調理の光と同じくBOARDノード上で直接選択できます。
    formatLightToggle(state, item, special, escapeHtml) {
      if (state.traitId !== "light") {
        return "";
      }

      const activeClass = item.isGlowing === true ? " active" : "";
      const label = item.isGlowing === true ? `${item.name}の光を解除` : `${item.name}を光らせる`;
      const heatNote = special.isGlowing ? "有効" : "選択";

      return `
        <button class="board-light-toggle${activeClass}" type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
          光${escapeHtml(heatNote)}
        </button>
      `;
    },
  };

  // 鍛冶の光地金は200℃単位の温度でだけ有効にします。
  function isLightHeatActive(state) {
    const heat = Number(state?.heat);
    return state?.traitId === "light" &&
      Number.isFinite(heat) &&
      heat % 200 === 0;
  }

  // 鍛冶の右クリック編集で光状態を操作できるかを返します。
  function canEditLightState(state) {
    return state?.traitId === "light";
  }

  // 鍛冶BOARD内の温度プルダウンを基本設定と同じ候補で描画します。
  function renderTemperatureSelect({ config, state, elements }) {
    if (!elements.smithingTemperatureSelect) {
      return;
    }

    elements.smithingTemperatureSelect.replaceChildren();
    config.heatStates.forEach((heatState) => {
      const option = document.createElement("option");
      option.value = heatState.id;
      option.textContent = heatState.label;
      elements.smithingTemperatureSelect.append(option);
    });
    elements.smithingTemperatureSelect.value = state.heat;
  }

  // 鍛冶BOARD下に現在温度の威力別ダメージ表を描画します。
  function renderBoardReference({ config, state, elements, escapeHtml }) {
    const smithingDamage = global.DQ10SmithingDamage || {};
    const rangeSet = smithingDamage.ranges?.[state.heat];
    const criticalMultiplier = toNumber(smithingDamage.criticalMultiplier, 2);
    const heatStates = config.heatStates || [];
    const currentHeat = toNumber(state.heat, 0);
    const heatValues = heatStates.map((heatState) => toNumber(heatState.id, currentHeat));
    const minHeat = Math.min(...heatValues);
    const maxHeat = Math.max(...heatValues);

    if (!elements.smithingDamagePanel || !elements.smithingDamageRanges) {
      return;
    }

    elements.smithingDamagePanel.hidden = false;
    if (elements.smithingTemperatureSelect) {
      elements.smithingTemperatureSelect.value = state.heat;
    }
    if (elements.smithingHeatDownButton) {
      elements.smithingHeatDownButton.disabled = currentHeat <= minHeat;
    }
    if (elements.smithingHeatUpButton) {
      elements.smithingHeatUpButton.disabled = currentHeat >= maxHeat;
    }

    elements.smithingDamageRanges.replaceChildren();
    getSmithingDamagePowerEntries().forEach(([powerId, power]) => {
      const range = rangeSet?.[powerId];
      const row = document.createElement("div");
      row.className = "smithing-damage-row";

      if (!range) {
        row.innerHTML = `
          <strong>${escapeHtml(power.label)}</strong>
          <span>-</span>
          <small>未設定</small>
        `;
      } else {
        row.innerHTML = `
          <strong>${escapeHtml(power.label)}</strong>
          <span class="numeric">${range[0]} - ${range[1]}</span>
          <small class="numeric">
            <span>最大 ${range[1]}</span>
            <span>会心最小 ${range[0] * criticalMultiplier}</span>
          </small>
        `;
      }
      elements.smithingDamageRanges.append(row);
    });
  }

  // 鍛冶ダメージ倍率を低い順で表示するため、定義値の倍率で整列します。
  function getSmithingDamagePowerEntries() {
    const powers = global.DQ10SmithingDamage?.powers || {};
    return Object.entries(powers).sort(([, a], [, b]) =>
      toNumber(a.multiplier, 0) - toNumber(b.multiplier, 0),
    );
  }

  // 温度上下ボタンで選べる次の温度IDを返します。
  function getNextHeat(config, state, delta) {
    const nextHeat = String(toNumber(state?.heat, 0) + delta);
    return config.heatStates.some((heatState) => heatState.id === nextHeat) ? nextHeat : "";
  }

  // 鍛冶の温度変更時に、基本設定とBOARD内の温度表示を同期します。
  function applyHeatChange({ state, elements }, nextHeat) {
    state.heat = nextHeat;
    elements.heatInput.value = state.heat;
    if (elements.smithingTemperatureSelect) {
      elements.smithingTemperatureSelect.value = state.heat;
    }
  }

  // 鍛冶コンポーネント内で使う数値変換を共通化します。
  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  // 鍛冶3職人で共通する設定を職人別差分と結合します。
  function createDQ10SmithingCraftConfig(options) {
    return {
      recipeLabel: options.recipeLabel || "装備名",
      itemNameLabel: "マス名",
      resourceLabel: "集中力",
      stateLabel: "温度",
      targetMode: "random-in-range",
      defaultTraitId: "none",
      // 鍛冶の開始温度はゲーム内の初期温度に合わせます。
      defaultHeatId: "1600",
      traits: [
        { id: "none", label: "なし", description: "通常の地金として扱います。" },
        { id: "light", label: "光地金", description: "温度が200の倍数の時だけ、選択したマスを光っている状態として扱います。" },
        { id: "double-half", label: "倍半", description: "400℃の倍数で威力2倍、200℃の倍数かつ400℃の倍数でない時は威力半減として扱います。" },
        { id: "return", label: "戻り", description: "200n+50℃の時に、次が戻りターンであることを表示します。戻り値は手動で入力します。" },
        { id: "focus-change", label: "集中変化", description: "400℃の倍数で消費集中半減、200℃の倍数かつ400℃の倍数でない時は消費集中1.5倍と会心率上昇として扱います。" },
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
      ...options,
    };
  }

  // 鍛冶3職人を同じ表示コンポーネントに紐づけます。
  ["weapon-smithing", "armor-smithing", "tool-smithing"].forEach((craftId) => {
    global.registerDQ10CraftComponent(craftId, smithingComponent);
  });

  global.createDQ10SmithingCraftConfig = createDQ10SmithingCraftConfig;
})(window);
