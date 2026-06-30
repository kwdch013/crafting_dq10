const storageKey = "dq10-craft-support-mvp";
const legacyStorageKey = "dq10-cooking-craft-mvp";
const apiBaseUrl = window.DQ10_API_BASE_URL || "http://localhost:8000";

const elements = {
  modeLabel: document.querySelector("#modeLabel"),
  craftType: document.querySelector("#craftType"),
  recipeNameLabel: document.querySelector("#recipeNameLabel span"),
  focusLabel: document.querySelector("#focusLabel span"),
  stateLabel: document.querySelector("#stateLabel span"),
  recipeName: document.querySelector("#recipeName"),
  recipeSelect: document.querySelector("#recipeSelect"),
  recipeSpecialEventLabel: document.querySelector("#recipeSpecialEventLabel"),
  recipeSpecialEventInput: document.querySelector("#recipeSpecialEventInput"),
  recipeSpecialEventDescription: document.querySelector("#recipeSpecialEventDescription"),
  levelSelect: document.querySelector("#levelSelect"),
  toolSelect: document.querySelector("#toolSelect"),
  toolStarsSelect: document.querySelector("#toolStarsSelect"),
  focusInput: document.querySelector("#focusInput"),
  focusNote: document.querySelector("#focusNote"),
  heatInput: document.querySelector("#heatInput"),
  itemSectionTitle: document.querySelector("#itemSectionTitle"),
  itemNameHeader: document.querySelector("#itemNameHeader"),
  ingredientTypeHeader: document.querySelector("#ingredientTypeHeader"),
  itemOptionHeader: document.querySelector("#itemOptionHeader"),
  targetHeader: document.querySelector("#targetHeader"),
  successMinHeader: document.querySelector("#successMinHeader"),
  successMaxHeader: document.querySelector("#successMaxHeader"),
  techniqueEditor: document.querySelector("#techniqueEditor"),
  craftReferencePanel: document.querySelector("#craftReferencePanel"),
  recipeSpecialEventReference: document.querySelector("#recipeSpecialEventReference"),
  ingredientTypeRanges: document.querySelector("#ingredientTypeRanges"),
  cookingDamageRanges: document.querySelector("#cookingDamageRanges"),
  layoutSectionTitle: document.querySelector("#layoutSectionTitle"),
  boardActions: document.querySelector("#boardActions"),
  undoBoardButton: document.querySelector("#undoBoardButton"),
  redoBoardButton: document.querySelector("#redoBoardButton"),
  shiftBoardUpButton: document.querySelector("#shiftBoardUpButton"),
  layoutBoard: document.querySelector("#layoutBoard"),
  ingredientBody: document.querySelector("#ingredientBody"),
  ingredientRowTemplate: document.querySelector("#ingredientRowTemplate"),
  techniqueTemplate: document.querySelector("#techniqueTemplate"),
  addIngredientButton: document.querySelector("#addIngredientButton"),
  exportButton: document.querySelector("#exportButton"),
  resetButton: document.querySelector("#resetButton"),
  importInput: document.querySelector("#importInput"),
  captureButton: document.querySelector("#captureButton"),
  capturePreview: document.querySelector("#capturePreview"),
  guaranteedCount: document.querySelector("#guaranteedCount"),
  warningCount: document.querySelector("#warningCount"),
  dangerCount: document.querySelector("#dangerCount"),
  recommendationList: document.querySelector("#recommendationList"),
};

let state;
let selectedBoardIngredientId = null;
let undoStack = [];
let redoStack = [];
const maxHistoryEntries = 50;

async function hydrateRecipesFromApi() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/recipes`, { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    if (payload?.crafts && typeof payload.crafts === "object") {
      window.DQ10CraftRecipes = {
        ...(window.DQ10CraftRecipes || {}),
        ...payload.crafts,
      };
    }
  } catch {
    // The local recipe files remain available when the API is offline.
  }
}

function loadState() {
  const stored = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);

  if (stored) {
    try {
      return normalizeState(JSON.parse(stored));
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  return normalizeState({
    craftType: "cooking",
  });
}

function normalizeState(value) {
  const config = getCraftConfig(value.craftType);
  const techniques = config.techniques;
  const recipes = getCraftRecipes(config.id);
  const defaultRecipe = recipes[0];
  const recipeId = recipes.some((recipe) => recipe.id === value.recipeId)
    ? value.recipeId
    : defaultRecipe?.id || "custom";
  const layoutSignature = createLayoutSignature(config);
  const shouldResetFixedLayout = config.layout?.fixed && value.layoutSignature !== layoutSignature;
  const defaultItems = getRecipeItems(config, recipeId);
  const sourceIngredients = !shouldResetFixedLayout && Array.isArray(value.ingredients) && value.ingredients.length > 0
    ? value.ingredients
    : defaultItems;
  const ingredients = sourceIngredients.map((ingredient, index) => {
    const defaultItem = findDefaultItem(config, ingredient, index);
    const successMin = numberOr(ingredient.successMin, defaultItem?.successMin ?? 60);
    const successMax = numberOr(ingredient.successMax, defaultItem?.successMax ?? 75);

    return {
      id: ingredient.id || defaultItem?.id || createId(),
      name: ingredient.name || defaultItem?.name || `${config.itemNameLabel.replace("名", "")} ${index + 1}`,
      ingredientTypeId: ingredient.ingredientTypeId || defaultItem?.ingredientTypeId || "",
      optionId: ingredient.optionId || defaultItem?.optionId || config.itemOptions?.[0]?.id || "",
      gridCell: normalizeGridCell(ingredient.gridCell || defaultItem?.gridCell, index, config.layout),
      current: numberOr(ingredient.current, defaultItem?.current ?? 0),
      target: numberOr(ingredient.target, defaultItem?.target ?? Math.round((successMin + successMax) / 2)),
      successMin,
      successMax,
    };
  });
  const heat = config.heatStates.some((candidate) => candidate.id === value.heat)
    ? value.heat
    : config.heatStates[0].id;
  const focusSelection = normalizeFocusSelection(config, value);
  const recipeSpecialEventId = getRecipeSpecialEventId(config, recipeId);
  const specialEventId = normalizeSpecialEventId(config, value.specialEventId || recipeSpecialEventId);

  return {
    recipeId,
    recipeName: value.recipeName || getRecipeLabel(config, recipeId),
    specialEventId,
    craftType: config.id,
    level: focusSelection.level,
    toolId: focusSelection.toolId,
    toolStars: focusSelection.toolStars,
    focus: calculateFocus(config, focusSelection),
    heat,
    targetMode: config.targetMode || "fixed",
    layoutSignature,
    techniques: techniques.map((technique, index) => ({
      id: technique.id || `tech-${index + 1}`,
      name: technique.name || `特技 ${index + 1}`,
      focusCost: numberOr(technique.focusCost, 0),
      normalMin: numberOr(technique.normalMin, 0),
      normalMax: numberOr(technique.normalMax, 0),
      criticalMin: numberOr(technique.criticalMin, 0),
      criticalMax: numberOr(technique.criticalMax, 0),
      criticalWeight: numberOr(technique.criticalWeight, 1),
      damageModel: technique.damageModel,
      powerId: technique.powerId,
      actionId: technique.actionId,
      repeat: technique.repeat,
      multiplier: technique.multiplier,
      criticalMultiplier: technique.criticalMultiplier,
      conditionId: technique.conditionId,
      scoring: technique.scoring || undefined,
    })),
    ingredients,
  };
}

function createLayoutSignature(config) {
  if (!config.layout) {
    return "free";
  }

  return `${config.layout.columns}x${config.layout.rows}:${config.items.length}`;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCraftRecipes(craftId) {
  return window.DQ10CraftRecipes?.[craftId] || [];
}

function getSelectedRecipe(config, recipeId) {
  return getCraftRecipes(config.id).find((recipe) => recipe.id === recipeId);
}

function getRecipeItems(config, recipeId) {
  return getSelectedRecipe(config, recipeId)?.items || config.items;
}

function getRecipeLabel(config, recipeId) {
  return getSelectedRecipe(config, recipeId)?.name || config.defaultRecipeName;
}

function getRecipeSpecialEventId(config, recipeId) {
  return getSelectedRecipe(config, recipeId)?.specialEventId || config.defaultSpecialEventId || "none";
}

function getSpecialEvents(config) {
  return config.specialEvents || [];
}

function hasSpecialEvents(config) {
  return getSpecialEvents(config).length > 0;
}

function normalizeSpecialEventId(config, specialEventId) {
  const events = getSpecialEvents(config);
  const fallback = config.defaultSpecialEventId || events[0]?.id || "";
  return events.some((event) => event.id === specialEventId) ? specialEventId : fallback;
}

function getSpecialEvent(config, specialEventId) {
  const normalized = normalizeSpecialEventId(config, specialEventId);
  return getSpecialEvents(config).find((event) => event.id === normalized);
}

function findDefaultItem(config, ingredient, index) {
  return config.items.find((item) => item.id === ingredient.id) || config.items[index];
}

function normalizeGridCell(value, index, layout) {
  const columns = Math.max(1, numberOr(layout?.columns, 1));
  const rows = Math.max(1, numberOr(layout?.rows, Math.ceil((index + 1) / columns)));
  const fallback = {
    row: Math.min(rows, Math.floor(index / columns) + 1),
    column: ((index % columns) + 1),
  };

  if (!value) {
    return fallback;
  }

  const row = numberOr(value.row, fallback.row);
  const column = numberOr(value.column, fallback.column);
  const rowSpan = Math.max(1, numberOr(value.rowSpan, 1));
  const columnSpan = Math.max(1, numberOr(value.columnSpan, 1));

  return {
    row: Math.min(Math.max(1, row), rows),
    column: Math.min(Math.max(1, column), columns),
    rowSpan,
    columnSpan,
  };
}

function getFocusConfig(config) {
  return config.focus || createDQ10FocusConfig({
    defaultFocus: config.defaultFocus,
    defaultLevel: 80,
    defaultToolId: "default-tool",
    defaultStars: 0,
    toolTypes: [{ id: "default-tool", label: "道具" }],
  });
}

function normalizeFocusSelection(config, value) {
  const focusConfig = getFocusConfig(config);
  const level = focusConfig.levels.some((entry) => entry.level === numberOr(value.level, NaN))
    ? numberOr(value.level, focusConfig.defaultLevel)
    : focusConfig.defaultLevel;
  const toolId = focusConfig.tools.some((tool) => tool.id === value.toolId)
    ? value.toolId
    : focusConfig.defaultToolId;
  const toolStars = focusConfig.stars.includes(numberOr(value.toolStars, NaN))
    ? numberOr(value.toolStars, focusConfig.defaultStars)
    : focusConfig.defaultStars;

  return { level, toolId, toolStars };
}

function calculateFocus(config, selection) {
  const focusConfig = getFocusConfig(config);
  const levelEntry = focusConfig.levels.find((entry) => entry.level === selection.level);
  const tool = focusConfig.tools.find((candidate) => candidate.id === selection.toolId);
  const baseFocus = numberOr(levelEntry?.focus, config.defaultFocus);
  const toolBonus = numberOr(tool?.focusBonusByStars?.[selection.toolStars], 0);

  return baseFocus + toolBonus;
}

function getCraftConfig(craftType) {
  const configs = window.DQ10CraftConfigs || {};
  return configs[craftType] || configs.cooking || Object.values(configs)[0];
}

function getCurrentCraftConfig() {
  return getCraftConfig(state.craftType);
}

function cloneConfigItems(items) {
  return items.map((item) => ({ ...item }));
}

function createDefaultState(craftType) {
  const config = getCraftConfig(craftType);
  const defaultRecipe = getCraftRecipes(config.id)[0];
  const focusConfig = getFocusConfig(config);
  const focusSelection = {
    level: focusConfig.defaultLevel,
    toolId: focusConfig.defaultToolId,
    toolStars: focusConfig.defaultStars,
  };

  return normalizeState({
    craftType: config.id,
    recipeId: defaultRecipe?.id || "custom",
    recipeName: defaultRecipe?.name || config.defaultRecipeName,
    specialEventId: defaultRecipe?.specialEventId || config.defaultSpecialEventId || "none",
    level: focusSelection.level,
    toolId: focusSelection.toolId,
    toolStars: focusSelection.toolStars,
    focus: calculateFocus(config, focusSelection),
    heat: config.heatStates[0].id,
    targetMode: config.targetMode || "fixed",
    techniques: cloneConfigItems(config.techniques),
    ingredients: cloneConfigItems(defaultRecipe?.items || config.items),
  });
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  localStorage.removeItem(legacyStorageKey);
}

function createBoardSnapshot() {
  return {
    ingredients: state.ingredients.map((ingredient) => ({
      ...ingredient,
      gridCell: ingredient.gridCell ? { ...ingredient.gridCell } : undefined,
    })),
  };
}

function restoreBoardSnapshot(snapshot) {
  state.ingredients = snapshot.ingredients.map((ingredient) => ({
    ...ingredient,
    gridCell: ingredient.gridCell ? { ...ingredient.gridCell } : undefined,
  }));
  selectedBoardIngredientId = null;
  renderIngredients();
  renderLayoutBoard();
  renderCraftReference();
  renderAnalysis();
  saveState();
}

function pushBoardHistory() {
  undoStack.push(createBoardSnapshot());
  if (undoStack.length > maxHistoryEntries) {
    undoStack.shift();
  }
  redoStack = [];
  syncBoardActionButtons();
}

function clearBoardHistory() {
  selectedBoardIngredientId = null;
  undoStack = [];
  redoStack = [];
  syncBoardActionButtons();
}

function render() {
  renderCraftOptions();
  renderCraftLabels();
  syncStaticInputs();
  renderRecipeOptions();
  renderSpecialEventOptions();
  renderFocusOptions();
  renderHeatOptions();
  renderTechniqueEditor();
  renderCraftReference();
  renderIngredients();
  renderLayoutBoard();
  renderAnalysis();
  syncBoardActionButtons();
  saveState();
}

function syncStaticInputs() {
  elements.craftType.value = state.craftType;
  elements.recipeSelect.value = state.recipeId;
  elements.recipeName.value = state.recipeName;
  elements.recipeSpecialEventInput.value = state.specialEventId;
  elements.levelSelect.value = state.level;
  elements.toolSelect.value = state.toolId;
  elements.toolStarsSelect.value = state.toolStars;
  elements.focusInput.value = state.focus;
  elements.heatInput.value = state.heat;
}

function renderRecipeOptions() {
  const config = getCurrentCraftConfig();
  const recipes = getCraftRecipes(config.id);
  elements.recipeSelect.replaceChildren();

  recipes.forEach((recipe) => {
    const option = document.createElement("option");
    option.value = recipe.id;
    option.textContent = recipe.category ? `${recipe.category}: ${recipe.name}` : recipe.name;
    elements.recipeSelect.append(option);
  });

  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "手入力";
  elements.recipeSelect.append(customOption);
  elements.recipeSelect.disabled = recipes.length === 0;
  elements.recipeSelect.value = recipes.some((recipe) => recipe.id === state.recipeId)
    ? state.recipeId
    : "custom";
}

function renderSpecialEventOptions() {
  const config = getCurrentCraftConfig();
  const events = getSpecialEvents(config);
  const shouldShow = events.length > 0;
  elements.recipeSpecialEventLabel.hidden = !shouldShow;

  if (!shouldShow) {
    return;
  }

  state.specialEventId = normalizeSpecialEventId(config, state.specialEventId);
  elements.recipeSpecialEventInput.replaceChildren();
  events.forEach((event) => {
    const option = document.createElement("option");
    option.value = event.id;
    option.textContent = event.label;
    elements.recipeSpecialEventInput.append(option);
  });

  elements.recipeSpecialEventInput.value = state.specialEventId;
  renderSpecialEventDescription();
}

function renderSpecialEventDescription() {
  const config = getCurrentCraftConfig();
  const event = getSpecialEvent(config, state.specialEventId);
  elements.recipeSpecialEventDescription.textContent = event?.description || "";
}

function renderFocusOptions() {
  const config = getCurrentCraftConfig();
  const focusConfig = getFocusConfig(config);

  elements.levelSelect.replaceChildren();
  focusConfig.levels.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.level;
    option.textContent = `${entry.level}`;
    elements.levelSelect.append(option);
  });

  elements.toolSelect.replaceChildren();
  focusConfig.tools.forEach((tool) => {
    const option = document.createElement("option");
    option.value = tool.id;
    option.textContent = tool.label;
    elements.toolSelect.append(option);
  });

  elements.toolStarsSelect.replaceChildren();
  focusConfig.stars.forEach((star) => {
    const option = document.createElement("option");
    option.value = star;
    option.textContent = `★${star}`;
    elements.toolStarsSelect.append(option);
  });

  const normalized = normalizeFocusSelection(config, state);
  state.level = normalized.level;
  state.toolId = normalized.toolId;
  state.toolStars = normalized.toolStars;
  state.focus = calculateFocus(config, normalized);
  elements.levelSelect.value = state.level;
  elements.toolSelect.value = state.toolId;
  elements.toolStarsSelect.value = state.toolStars;
  elements.focusInput.value = state.focus;
}

function renderCraftOptions() {
  const configs = Object.values(window.DQ10CraftConfigs || {});
  elements.craftType.replaceChildren();

  configs.forEach((config) => {
    const option = document.createElement("option");
    option.value = config.id;
    option.textContent = config.label;
    elements.craftType.append(option);
  });
}

function renderCraftLabels() {
  const config = getCurrentCraftConfig();
  elements.modeLabel.textContent = config.modeLabel;
  elements.recipeNameLabel.textContent = config.recipeLabel;
  elements.focusLabel.textContent = config.resourceLabel;
  elements.stateLabel.textContent = config.stateLabel || "火力状態";
  elements.focusNote.textContent = config.focusNote || "";
  elements.focusNote.hidden = !config.focusNote;
  elements.itemSectionTitle.textContent = config.itemSectionTitle;
  elements.layoutSectionTitle.textContent = config.layout?.label || `${config.label}配置`;
  elements.itemNameHeader.textContent = config.itemNameLabel;
  elements.ingredientTypeHeader.textContent = config.ingredientTypeLabel || "食材種別";
  elements.ingredientTypeHeader.hidden = !hasIngredientTypes(config);
  elements.itemOptionHeader.textContent = config.itemOptionLabel || "種別";
  elements.targetHeader.textContent = config.targetMode === "random-in-range" ? "代表値" : "基準値";
  elements.successMinHeader.textContent = config.targetMode === "random-in-range" ? "基準下限" : "成功下限";
  elements.successMaxHeader.textContent = config.targetMode === "random-in-range" ? "基準上限" : "成功上限";
  elements.addIngredientButton.textContent = config.addItemLabel;
  elements.addIngredientButton.disabled = !findNextGridCell(config, state.ingredients.length);
}

function renderHeatOptions() {
  const config = getCurrentCraftConfig();
  const currentValue = state.heat;
  elements.heatInput.replaceChildren();

  config.heatStates.forEach((heatState) => {
    const option = document.createElement("option");
    option.value = heatState.id;
    option.textContent = heatState.label;
    elements.heatInput.append(option);
  });

  elements.heatInput.value = config.heatStates.some((heatState) => heatState.id === currentValue)
    ? currentValue
    : config.heatStates[0].id;
  state.heat = elements.heatInput.value;
}

function renderTechniqueEditor() {
  elements.techniqueEditor.replaceChildren();
  const config = getCurrentCraftConfig();
  const previewIngredient = getTechniquePreviewIngredient(config);

  state.techniques.forEach((technique) => {
    const resolvedTechnique = DQ10CraftEngine.resolveTechnique(state, technique, previewIngredient);
    const card = elements.techniqueTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.id = technique.id;
    card.querySelector(".technique-title").textContent = technique.name;
    card.querySelector(".tech-focus").textContent = resolvedTechnique.focusCost;
    card.querySelector(".tech-normal-range").textContent = `${resolvedTechnique.normalMin} - ${resolvedTechnique.normalMax}`;
    card.querySelector(".tech-critical-range").textContent = `${resolvedTechnique.criticalMin} - ${resolvedTechnique.criticalMax}`;
    card.querySelector(".tech-multiplier").textContent = `${resolvedTechnique.multiplier || 1}倍`;
    elements.techniqueEditor.append(card);
  });
}

function renderCraftReference() {
  const config = getCurrentCraftConfig();
  const cookingDamage = window.DQ10CookingDamage;
  const shouldShow = config.id === "cooking" && cookingDamage;
  elements.craftReferencePanel.hidden = !shouldShow;

  if (!shouldShow) {
    return;
  }

  renderIngredientTypeRanges(config);
  renderRecipeSpecialEventReference(config);
  renderCookingDamageRanges(cookingDamage);
}

function renderRecipeSpecialEventReference(config) {
  const event = getSpecialEvent(config, state.specialEventId);
  elements.recipeSpecialEventReference.innerHTML = `
    <div class="reference-row special-event-reference">
      <strong>${escapeHtml(event?.label || "-")}</strong>
      <span>${escapeHtml(event?.description || "-")}</span>
    </div>
  `;
}

function renderIngredientTypeRanges(config) {
  const assigned = new Set();
  const rows = (config.ingredientTypes || []).map((ingredientType) => {
    const ingredients = state.ingredients.filter((ingredient) => ingredient.ingredientTypeId === ingredientType.id);
    ingredients.forEach((ingredient) => assigned.add(ingredient.id));
    return createIngredientTypeRangeRow(ingredientType.label, ingredients);
  });
  const unassigned = state.ingredients.filter((ingredient) => !assigned.has(ingredient.id));

  if (unassigned.length > 0) {
    rows.push(createIngredientTypeRangeRow("未設定", unassigned));
  }

  elements.ingredientTypeRanges.innerHTML = rows.join("");
}

function createIngredientTypeRangeRow(label, ingredients) {
  const ranges = [...new Set(ingredients.map((ingredient) => `${ingredient.successMin} - ${ingredient.successMax}`))];
  const names = ingredients.map((ingredient) => ingredient.name).join("、");
  const rangeText = ranges.length > 0 ? ranges.join(" / ") : "-";
  const nameText = names || "-";

  return `
    <div class="reference-row">
      <strong>${escapeHtml(label)}</strong>
      <span class="numeric">${escapeHtml(rangeText)}</span>
      <small>${escapeHtml(nameText)}</small>
    </div>
  `;
}

function renderCookingDamageRanges(cookingDamage) {
  const heatLabels = {
    normal: "通常",
    strong: "強火焼き",
    half: "弱火焼き",
  };
  const rows = cookingDamage.positions.map((position) => {
    const ranges = ["normal", "strong", "half"].map((conditionId) => {
      const range = cookingDamage.getRange(position.id, conditionId);
      const values = cookingDamage.distributions?.[position.id]?.[conditionId] || range;
      return `${heatLabels[conditionId]} ${values ? values.join("/") : "-"}`;
    }).join(" / ");

    return `
      <div class="reference-row">
        <strong>${escapeHtml(position.label)}</strong>
        <span class="numeric">${escapeHtml(ranges)}</span>
        <small>${escapeHtml(getDefaultHeatLabel(position.id))}</small>
      </div>
    `;
  });

  elements.cookingDamageRanges.innerHTML = rows.join("");
}

function getDefaultHeatLabel(positionId) {
  const labels = {
    center: "デフォルト火力: 強",
    cross: "デフォルト火力: 中",
    corner: "デフォルト火力: 弱",
  };

  return labels[positionId] || "";
}

function getTechniquePreviewIngredient(config) {
  return state.ingredients.find((ingredient) => ingredient.optionId === config.techniquePreviewOptionId) ||
    state.ingredients[0];
}

function renderIngredients() {
  elements.ingredientBody.replaceChildren();
  const analysis = DQ10CraftEngine.analyzeState(state);

  analysis.ingredients.forEach((ingredient) => {
    const row = elements.ingredientRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = ingredient.id;

    bindIngredientText(row.querySelector(".ingredient-name"), ingredient.id, "name", ingredient.name);
    bindIngredientType(row.querySelector(".ingredient-type"), row.querySelector(".ingredient-type-cell"), ingredient.id, ingredient.ingredientTypeId);
    bindIngredientOption(row.querySelector(".ingredient-option"), ingredient.id, ingredient.optionId);
    bindIngredientNumber(row.querySelector(".ingredient-current"), ingredient.id, "current", ingredient.current);
    const targetInput = row.querySelector(".ingredient-target");
    bindIngredientNumber(targetInput, ingredient.id, "target", ingredient.target);
    targetInput.readOnly = state.targetMode === "random-in-range";
    targetInput.title = state.targetMode === "random-in-range"
      ? "ランダム基準幅の代表値です。判定には基準下限と基準上限を使います。"
      : "";
    bindIngredientNumber(row.querySelector(".ingredient-min"), ingredient.id, "successMin", ingredient.successMin);
    bindIngredientNumber(row.querySelector(".ingredient-max"), ingredient.id, "successMax", ingredient.successMax);

    row.querySelector(".lower-diff").textContent = formatSigned(ingredient.lowerDiff);
    row.querySelector(".upper-diff").textContent = formatSigned(ingredient.upperDiff);
    row.querySelector(".normal-range").innerHTML = formatTechniqueResults(ingredient.techniqueAnalyses, "normal");
    row.querySelector(".critical-range").innerHTML = formatTechniqueResults(ingredient.techniqueAnalyses, "critical");

    const status = row.querySelector(".status");
    status.textContent = ingredient.statusLabel;
    status.classList.add(`status-${ingredient.status}`);

    row.querySelector(".remove-ingredient").addEventListener("click", () => removeIngredient(ingredient.id));
    elements.ingredientBody.append(row);
  });
}

function renderLayoutBoard() {
  const config = getCurrentCraftConfig();
  const layout = config.layout || { rows: 1, columns: state.ingredients.length };
  const rows = Math.max(1, numberOr(layout.rows, 1));
  const columns = Math.max(1, numberOr(layout.columns, state.ingredients.length || 1));
  const analysis = DQ10CraftEngine.analyzeState(state);
  const occupiedCells = new Set();
  const canRearrange = canRearrangeBoard(config);

  elements.layoutBoard.replaceChildren();
  elements.layoutBoard.style.gridTemplateColumns = `repeat(${columns}, minmax(110px, 1fr))`;

  for (let rowIndex = 1; rowIndex <= rows; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= columns; columnIndex += 1) {
      const key = `${rowIndex}:${columnIndex}`;

      if (occupiedCells.has(key)) {
        continue;
      }

      const item = analysis.ingredients.find((ingredient) =>
        ingredient.gridCell?.row === rowIndex && ingredient.gridCell?.column === columnIndex,
      );
      const cell = document.createElement("article");
      cell.className = "board-cell";

      if (!item) {
        cell.classList.add("empty");
        cell.textContent = "空";
        if (canRearrange) {
          cell.classList.add("interactive");
          cell.addEventListener("click", () => handleBoardCellClick(null, { row: rowIndex, column: columnIndex }));
        }
        elements.layoutBoard.append(cell);
        continue;
      }

      const rowSpan = Math.max(1, numberOr(item.gridCell?.rowSpan, 1));
      const columnSpan = Math.max(1, numberOr(item.gridCell?.columnSpan, 1));
      cell.style.gridRow = `span ${rowSpan}`;
      cell.style.gridColumn = `span ${columnSpan}`;
      cell.dataset.id = item.id;
      if (item.id === selectedBoardIngredientId) {
        cell.classList.add("selected");
      }

      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
          occupiedCells.add(`${rowIndex + rowOffset}:${columnIndex + columnOffset}`);
        }
      }

      cell.innerHTML = `
        <div class="board-cell-head">
          <strong>${escapeHtml(item.name)}</strong>
          <div class="board-cell-badges">
            ${formatBoardBadge(getIngredientTypeLabel(config, item.ingredientTypeId))}
            ${formatBoardBadge(getItemOptionLabel(config, item.optionId))}
          </div>
        </div>
        <div class="board-cell-values">
          <span class="numeric">${item.current}</span>
          <small class="numeric">${escapeHtml(formatTargetSummary(item, state.targetMode))}</small>
        </div>
        <span class="status status-${item.status}">${escapeHtml(item.statusLabel)}</span>
      `;
      cell.addEventListener("click", () => {
        if (canRearrange) {
          handleBoardCellClick(item, { row: rowIndex, column: columnIndex });
          return;
        }

        focusIngredientRow(item.id);
      });
      elements.layoutBoard.append(cell);
    }
  }
  syncBoardActionButtons();
}

function canRearrangeBoard(config = getCurrentCraftConfig()) {
  return config.id === "cooking" && Boolean(config.layout?.fixed);
}

function syncBoardActionButtons() {
  const canRearrange = state ? canRearrangeBoard() : false;
  elements.boardActions.hidden = !canRearrange;
  elements.undoBoardButton.disabled = !canRearrange || undoStack.length === 0;
  elements.redoBoardButton.disabled = !canRearrange || redoStack.length === 0;
  elements.shiftBoardUpButton.disabled = !canRearrange || state.ingredients.length === 0;
}

function handleBoardCellClick(item, targetCell) {
  if (!canRearrangeBoard()) {
    return;
  }

  if (!selectedBoardIngredientId) {
    if (item) {
      selectedBoardIngredientId = item.id;
      renderLayoutBoard();
    }
    return;
  }

  if (item?.id === selectedBoardIngredientId) {
    selectedBoardIngredientId = null;
    renderLayoutBoard();
    return;
  }

  const selectedIngredient = state.ingredients.find((ingredient) => ingredient.id === selectedBoardIngredientId);
  if (!selectedIngredient) {
    selectedBoardIngredientId = item?.id || null;
    renderLayoutBoard();
    return;
  }

  const targetIngredient = item
    ? state.ingredients.find((ingredient) => ingredient.id === item.id)
    : null;
  if (item && !targetIngredient) {
    selectedBoardIngredientId = null;
    renderLayoutBoard();
    return;
  }

  pushBoardHistory();
  const sourceCell = createMovedGridCell(selectedIngredient.gridCell, selectedIngredient.gridCell);

  if (targetIngredient) {
    selectedIngredient.gridCell = createMovedGridCell(selectedIngredient.gridCell, targetIngredient.gridCell);
    targetIngredient.gridCell = createMovedGridCell(targetIngredient.gridCell, sourceCell);
    updateIngredientPositionOption(selectedIngredient);
    updateIngredientPositionOption(targetIngredient);
  } else {
    selectedIngredient.gridCell = createMovedGridCell(selectedIngredient.gridCell, targetCell);
    updateIngredientPositionOption(selectedIngredient);
  }

  selectedBoardIngredientId = null;
  markCustomRecipe();
  renderIngredients();
  renderLayoutBoard();
  renderCraftReference();
  renderAnalysis();
  saveState();
}

function createMovedGridCell(currentCell, targetCell) {
  return {
    ...(currentCell || {}),
    row: targetCell?.row,
    column: targetCell?.column,
  };
}

function updateIngredientPositionOption(ingredient) {
  const optionId = getBoardOptionId(ingredient.gridCell?.row, ingredient.gridCell?.column);
  if (optionId) {
    ingredient.optionId = optionId;
  }
}

function getBoardOptionId(row, column) {
  if (row === 2 && column === 2) {
    return "center";
  }

  if ((row === 2 && (column === 1 || column === 3)) || (column === 2 && (row === 1 || row === 3))) {
    return "cross";
  }

  return row && column ? "corner" : "";
}

function shiftBoardUp() {
  if (!canRearrangeBoard()) {
    return;
  }

  const layout = getCurrentCraftConfig().layout;
  const rows = Math.max(1, numberOr(layout?.rows, 1));
  pushBoardHistory();
  state.ingredients.forEach((ingredient) => {
    const row = numberOr(ingredient.gridCell?.row, 1);
    const column = numberOr(ingredient.gridCell?.column, 1);
    ingredient.gridCell = {
      ...ingredient.gridCell,
      row: row <= 1 ? rows : row - 1,
      column,
    };
    updateIngredientPositionOption(ingredient);
  });
  selectedBoardIngredientId = null;
  markCustomRecipe();
  renderIngredients();
  renderLayoutBoard();
  renderCraftReference();
  renderAnalysis();
  saveState();
}

function undoBoardAction() {
  if (undoStack.length === 0) {
    return;
  }

  redoStack.push(createBoardSnapshot());
  restoreBoardSnapshot(undoStack.pop());
  syncBoardActionButtons();
}

function redoBoardAction() {
  if (redoStack.length === 0) {
    return;
  }

  undoStack.push(createBoardSnapshot());
  restoreBoardSnapshot(redoStack.pop());
  syncBoardActionButtons();
}

function formatTargetSummary(item, targetMode) {
  if (targetMode === "random-in-range") {
    return `基準幅 ${item.successMin} - ${item.successMax}`;
  }

  return `基準 ${item.target} / ${item.successMin} - ${item.successMax}`;
}

function getItemOptionLabel(config, optionId) {
  const option = config.itemOptions?.find((itemOption) => itemOption.id === optionId);
  return option?.label || "";
}

function getIngredientTypeLabel(config, ingredientTypeId) {
  const ingredientType = config.ingredientTypes?.find((item) => item.id === ingredientTypeId);
  return ingredientType?.label || "";
}

function formatBoardBadge(label) {
  return label ? `<span>${escapeHtml(label)}</span>` : "";
}

function focusIngredientRow(id) {
  const row = elements.ingredientBody.querySelector(`tr[data-id="${CSS.escape(id)}"]`);
  const input = row?.querySelector(".ingredient-current");

  if (input) {
    input.focus();
  }
}

function hasIngredientTypes(config) {
  return Array.isArray(config.ingredientTypes) && config.ingredientTypes.length > 0;
}

function bindIngredientType(select, cell, id, value) {
  const config = getCurrentCraftConfig();
  const ingredientTypes = config.ingredientTypes || [];
  cell.hidden = !hasIngredientTypes(config);

  if (!hasIngredientTypes(config)) {
    return;
  }

  select.replaceChildren();
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "未設定";
  select.append(emptyOption);

  ingredientTypes.forEach((ingredientType) => {
    const option = document.createElement("option");
    option.value = ingredientType.id;
    option.textContent = ingredientType.label;
    select.append(option);
  });

  select.value = ingredientTypes.some((ingredientType) => ingredientType.id === value) ? value : "";
  select.addEventListener("change", () => {
    updateIngredientType(id, select.value);
  });
}

function bindIngredientOption(select, id, value) {
  const config = getCurrentCraftConfig();
  const options = config.itemOptions || [];
  select.replaceChildren();

  if (options.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "-";
    select.append(option);
    select.disabled = true;
    return;
  }

  options.forEach((itemOption) => {
    const option = document.createElement("option");
    option.value = itemOption.id;
    option.textContent = itemOption.label;
    select.append(option);
  });

  select.value = options.some((itemOption) => itemOption.id === value) ? value : options[0].id;
  select.addEventListener("change", () => {
    updateIngredient(id, "optionId", select.value);
  });
}

function updateIngredientType(id, ingredientTypeId) {
  const config = getCurrentCraftConfig();
  const ingredientType = config.ingredientTypes?.find((item) => item.id === ingredientTypeId);
  const ingredient = state.ingredients.find((item) => item.id === id);

  if (!ingredient) {
    return;
  }

  ingredient.ingredientTypeId = ingredientTypeId;
  if (Number.isFinite(ingredientType?.successMin) && Number.isFinite(ingredientType?.successMax)) {
    ingredient.successMin = ingredientType.successMin;
    ingredient.successMax = ingredientType.successMax;
    ingredient.target = Math.round((ingredient.successMin + ingredient.successMax) / 2);
  }

  markCustomRecipe();
  refreshIngredientRow(id);
  renderLayoutBoard();
  renderCraftReference();
  renderAnalysis();
  saveState();
}

function bindIngredientText(input, id, key, value) {
  input.value = value;
  input.addEventListener("input", () => {
    updateIngredient(id, key, input.value);
  });
}

function bindIngredientNumber(input, id, key, value) {
  input.value = value;
  input.addEventListener("input", () => {
    updateIngredient(id, key, numberOr(input.value, 0));
  });
}

function updateIngredient(id, key, value) {
  const ingredient = state.ingredients.find((item) => item.id === id);

  if (!ingredient) {
    return;
  }

  ingredient[key] = value;
  if (key !== "current") {
    markCustomRecipe();
  }
  refreshIngredientRow(id);
  renderLayoutBoard();
  renderCraftReference();
  renderAnalysis();
  saveState();
}

function refreshIngredientRow(id) {
  const ingredient = state.ingredients.find((item) => item.id === id);
  const row = elements.ingredientBody.querySelector(`tr[data-id="${CSS.escape(id)}"]`);

  if (!ingredient || !row) {
    return;
  }

  const analysis = DQ10CraftEngine.analyzeIngredientAcrossTechniques(state, ingredient);
  row.querySelector(".lower-diff").textContent = formatSigned(analysis.lowerDiff);
  row.querySelector(".upper-diff").textContent = formatSigned(analysis.upperDiff);
  row.querySelector(".normal-range").innerHTML = formatTechniqueResults(analysis.techniqueAnalyses, "normal");
  row.querySelector(".critical-range").innerHTML = formatTechniqueResults(analysis.techniqueAnalyses, "critical");

  const status = row.querySelector(".status");
  status.className = "status";
  status.textContent = analysis.statusLabel;
  status.classList.add(`status-${analysis.status}`);
}

function renderAnalysis() {
  const analysis = DQ10CraftEngine.analyzeState(state);
  elements.guaranteedCount.textContent = analysis.guaranteedCount;
  elements.warningCount.textContent = analysis.warningCount;
  elements.dangerCount.textContent = analysis.dangerCount;

  const recommendation = DQ10CraftEngine.recommendTechniques(state);
  elements.recommendationList.replaceChildren();

  recommendation.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "recommendation-item";
    row.innerHTML = `
      <span class="rank">${index + 1}</span>
      <div>
        <strong>${escapeHtml(item.technique.name)}</strong>
        <p>${escapeHtml(item.reason)}</p>
      </div>
      <span class="score">${Math.round(item.score)}</span>
    `;
    elements.recommendationList.append(row);
  });
}

function formatTechniqueResults(techniqueAnalyses, type) {
  return `<div class="range-list">${techniqueAnalyses.map((analysis) => {
    const min = type === "critical" ? analysis.criticalAfterMin : analysis.normalAfterMin;
    const max = type === "critical" ? analysis.criticalAfterMax : analysis.normalAfterMax;
    return `
      <span>
        <strong>${escapeHtml(analysis.technique.name)}</strong>
        <em>${min} - ${max}</em>
      </span>
    `;
  }).join("")}</div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });
}

function formatSigned(value) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function removeIngredient(id) {
  if (state.ingredients.length <= 1) {
    return;
  }

  state.ingredients = state.ingredients.filter((ingredient) => ingredient.id !== id);
  markCustomRecipe();
  render();
}

function addIngredient() {
  const config = getCurrentCraftConfig();
  const next = state.ingredients.length + 1;
  const gridCell = findNextGridCell(config, state.ingredients.length);

  if (!gridCell) {
    return;
  }

  state.ingredients.push({
    id: createId(),
    name: `${config.itemNameLabel.replace("名", "")} ${next}`,
    ingredientTypeId: "",
    optionId: getBoardOptionId(gridCell.row, gridCell.column) || config.itemOptions?.[0]?.id || "",
    gridCell,
    current: 0,
    target: Math.round(((config.items[0]?.successMin || 60) + (config.items[0]?.successMax || 75)) / 2),
    successMin: config.items[0]?.successMin || 60,
    successMax: config.items[0]?.successMax || 75,
  });
  markCustomRecipe();
  render();
}

function applyRecipe(recipeId) {
  const config = getCurrentCraftConfig();
  const recipe = getSelectedRecipe(config, recipeId);
  clearBoardHistory();

  if (!recipe) {
    state.recipeId = "custom";
    render();
    return;
  }

  state.recipeId = recipe.id;
  state.recipeName = recipe.name;
  state.specialEventId = normalizeSpecialEventId(config, recipe.specialEventId || config.defaultSpecialEventId || "none");
  state.ingredients = cloneConfigItems(recipe.items);
  state.layoutSignature = createLayoutSignature(config);
  render();
}

function markCustomRecipe() {
  state.recipeId = "custom";
  if (elements.recipeSelect) {
    elements.recipeSelect.value = "custom";
  }
}

function resetState() {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(legacyStorageKey);
  clearBoardHistory();
  state = createDefaultState("cooking");
  render();
}

function findNextGridCell(config, index) {
  if (!config.layout) {
    return { row: 1, column: index + 1 };
  }

  const layout = config.layout || { columns: 1 };
  const used = new Set(state.ingredients.map((ingredient) =>
    `${ingredient.gridCell?.row || 1}:${ingredient.gridCell?.column || 1}`,
  ));
  const rows = Math.max(1, numberOr(layout.rows, 1));
  const columns = Math.max(1, numberOr(layout.columns, 1));

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      if (!used.has(`${row}:${column}`)) {
        return { row, column };
      }
    }
  }

  return null;
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `dq10-${state.craftType}-settings-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importState(event) {
  const [file] = event.target.files;

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      state = normalizeState(JSON.parse(String(reader.result)));
      clearBoardHistory();
      render();
    } catch {
      alert("設定ファイルの読み込みに失敗しました。ExportしたJSONを指定してください。");
    } finally {
      elements.importInput.value = "";
    }
  });
  reader.readAsText(file);
}

async function startCapturePreview() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    alert("このブラウザでは画面共有プレビューを利用できません。");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    elements.capturePreview.srcObject = stream;
    elements.capturePreview.hidden = false;
  } catch {
    alert("画面共有がキャンセルされました。");
  }
}

elements.recipeName.addEventListener("input", () => {
  state.recipeName = elements.recipeName.value;
  markCustomRecipe();
  saveState();
});
elements.recipeSpecialEventInput.addEventListener("change", () => {
  const config = getCurrentCraftConfig();
  state.specialEventId = normalizeSpecialEventId(config, elements.recipeSpecialEventInput.value);
  markCustomRecipe();
  renderSpecialEventDescription();
  renderCraftReference();
  saveState();
});
elements.recipeSelect.addEventListener("change", () => {
  applyRecipe(elements.recipeSelect.value);
});
elements.craftType.addEventListener("change", () => {
  clearBoardHistory();
  state = createDefaultState(elements.craftType.value);
  render();
});
function updateFocusFromSelection() {
  const config = getCurrentCraftConfig();
  state.level = numberOr(elements.levelSelect.value, state.level);
  state.toolId = elements.toolSelect.value;
  state.toolStars = numberOr(elements.toolStarsSelect.value, state.toolStars);
  state.focus = calculateFocus(config, state);
  elements.focusInput.value = state.focus;
  renderAnalysis();
  saveState();
}

elements.levelSelect.addEventListener("change", updateFocusFromSelection);
elements.toolSelect.addEventListener("change", updateFocusFromSelection);
elements.toolStarsSelect.addEventListener("change", updateFocusFromSelection);
elements.heatInput.addEventListener("change", () => {
  state.heat = elements.heatInput.value;
  renderTechniqueEditor();
  renderIngredients();
  renderAnalysis();
  saveState();
});
elements.addIngredientButton.addEventListener("click", addIngredient);
elements.undoBoardButton.addEventListener("click", undoBoardAction);
elements.redoBoardButton.addEventListener("click", redoBoardAction);
elements.shiftBoardUpButton.addEventListener("click", shiftBoardUp);
elements.exportButton.addEventListener("click", exportState);
elements.resetButton.addEventListener("click", resetState);
elements.importInput.addEventListener("change", importState);
elements.captureButton.addEventListener("click", startCapturePreview);
document.addEventListener("keydown", (event) => {
  const usesShortcutModifier = event.ctrlKey || event.metaKey;
  if (!usesShortcutModifier || !canRearrangeBoard()) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "z" && event.shiftKey) {
    event.preventDefault();
    redoBoardAction();
    return;
  }

  if (key === "z") {
    event.preventDefault();
    undoBoardAction();
    return;
  }

  if (key === "y") {
    event.preventDefault();
    redoBoardAction();
  }
});

async function initialize() {
  await hydrateRecipesFromApi();
  state = loadState();
  render();
}

initialize();
