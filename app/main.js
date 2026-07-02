const storageKey = "dq10-craft-support-mvp";
const legacyStorageKey = "dq10-cooking-craft-mvp";
const apiBaseUrl = window.DQ10_API_BASE_URL || "http://localhost:8000";

const elements = {
  modeLabel: document.querySelector("#modeLabel"),
  craftType: document.querySelector("#craftType"),
  focusLabel: document.querySelector("#focusLabel span"),
  stateLabel: document.querySelector("#stateLabel span"),
  recipeSelect: document.querySelector("#recipeSelect"),
  recipeTraitLabel: document.querySelector("#recipeTraitLabel"),
  recipeTraitInput: document.querySelector("#recipeTraitInput"),
  recipeTraitDescription: document.querySelector("#recipeTraitDescription"),
  levelSelect: document.querySelector("#levelSelect"),
  toolSelect: document.querySelector("#toolSelect"),
  toolStarsSelect: document.querySelector("#toolStarsSelect"),
  focusInput: document.querySelector("#focusInput"),
  focusNote: document.querySelector("#focusNote"),
  heatInput: document.querySelector("#heatInput"),
  itemSectionTitle: document.querySelector("#itemSectionTitle"),
  itemNameHeader: document.querySelector("#itemNameHeader"),
  itemOptionHeader: document.querySelector("#itemOptionHeader"),
  targetHeader: document.querySelector("#targetHeader"),
  successMinHeader: document.querySelector("#successMinHeader"),
  successMaxHeader: document.querySelector("#successMaxHeader"),
  techniqueEditor: document.querySelector("#techniqueEditor"),
  craftReferencePanel: document.querySelector("#craftReferencePanel"),
  recipeTraitReference: document.querySelector("#recipeTraitReference"),
  cookingDamageRanges: document.querySelector("#cookingDamageRanges"),
  layoutSectionTitle: document.querySelector("#layoutSectionTitle"),
  boardActions: document.querySelector("#boardActions"),
  undoBoardButton: document.querySelector("#undoBoardButton"),
  redoBoardButton: document.querySelector("#redoBoardButton"),
  shiftBoardUpButton: document.querySelector("#shiftBoardUpButton"),
  miracleGrillButton: document.querySelector("#miracleGrillButton"),
  miracleGrillResult: document.querySelector("#miracleGrillResult"),
  normalHeatButton: document.querySelector("#normalHeatButton"),
  strongHeatButton: document.querySelector("#strongHeatButton"),
  halfHeatButton: document.querySelector("#halfHeatButton"),
  clearCookingLightButton: document.querySelector("#clearCookingLightButton"),
  clearCookingEffectButton: document.querySelector("#clearCookingEffectButton"),
  crossGlowButton: document.querySelector("#crossGlowButton"),
  cornerReturnButton: document.querySelector("#cornerReturnButton"),
  swapBoardUpButton: document.querySelector("#swapBoardUpButton"),
  swapBoardDownButton: document.querySelector("#swapBoardDownButton"),
  swapBoardLeftButton: document.querySelector("#swapBoardLeftButton"),
  swapBoardRightButton: document.querySelector("#swapBoardRightButton"),
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
let boardCellEditorElement;
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
  const selectedRecipe = getSelectedRecipe(config, recipeId);
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
      optionId: ingredient.optionId || defaultItem?.optionId || config.itemOptions?.[0]?.id || "",
      gridCell: normalizeGridCell(ingredient.gridCell || defaultItem?.gridCell, index, config.layout),
      current: numberOr(ingredient.current, defaultItem?.current ?? 0),
      locked: ingredient.locked === true,
      lockJudgement: ingredient.lockJudgement || "",
      lockJudgementLabel: ingredient.lockJudgementLabel || "",
      isGlowing: ingredient.isGlowing === true,
      target: numberOr(ingredient.target, defaultItem?.target ?? Math.round((successMin + successMax) / 2)),
      successMin,
      successMax,
      ingredientGroupId: ingredient.ingredientGroupId || defaultItem?.ingredientGroupId || "",
      ingredientGroupLabel: ingredient.ingredientGroupLabel || defaultItem?.ingredientGroupLabel || "",
      ingredientSize: numberOr(ingredient.ingredientSize, defaultItem?.ingredientSize ?? 1),
    };
  });
  const heat = config.heatStates.some((candidate) => candidate.id === value.heat)
    ? value.heat
    : config.heatStates[0].id;
  const focusSelection = normalizeFocusSelection(config, value);
  const recipeTraitId = getRecipeTraitId(config, recipeId);
  const traitId = normalizeTraitId(config, value.traitId || value.specialEventId || recipeTraitId);

  return {
    recipeId,
    recipeName: value.recipeName || getRecipeLabel(config, recipeId),
    recipeCategory: value.recipeCategory || selectedRecipe?.category || "",
    recipeCategoryId: value.recipeCategoryId || selectedRecipe?.categoryId || "",
    traitId,
    cookingEffectMode: normalizeSavedCookingEffectMode(traitId, value.cookingEffectMode),
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
      specialAction: technique.specialAction,
      scoring: technique.scoring || undefined,
    })),
    ingredients,
    miracleGrillUsed: value.miracleGrillUsed === true,
    miracleGrillResult: typeof value.miracleGrillResult === "string" ? value.miracleGrillResult : "",
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
  const recipes = window.DQ10CraftRecipes?.[craftId] || [];
  return window.DQ10RecipeArchive?.getVisibleRecipes(recipes) ||
    recipes.filter((recipe) => recipe?.archived !== true);
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

function getRecipeTraitId(config, recipeId) {
  const recipe = getSelectedRecipe(config, recipeId);
  return recipe?.traitId || recipe?.specialEventId || config.defaultTraitId || "none";
}

function shouldShowCustomRecipeOption(config) {
  return window.DQ10RecipeArchive?.shouldShowCustomRecipeOption(config) ?? true;
}

function getTraits(config) {
  return config.traits || [];
}

function normalizeTraitId(config, traitId) {
  const traits = getTraits(config);
  const fallback = config.defaultTraitId || traits[0]?.id || "";
  const aliases = {
    glow: "light",
    "glow-return": "light-return",
    "light-recovery": "light-return",
    none: fallback,
    return: "recovery",
  };
  const normalized = aliases[traitId] || traitId;
  return traits.some((trait) => trait.id === normalized) ? normalized : fallback;
}

function getTrait(config, traitId) {
  const normalized = normalizeTraitId(config, traitId);
  return getTraits(config).find((trait) => trait.id === normalized);
}

function normalizeCookingEffectMode(traitId, value) {
  return DQ10CookingEffects.normalizeCookingEffectMode(traitId, value);
}

function getInitialCookingEffectMode(traitId) {
  return DQ10CookingEffects.getInitialCookingEffectMode(traitId);
}

function normalizeSavedCookingEffectMode(traitId, value) {
  return DQ10CookingEffects.normalizeSavedCookingEffectMode(traitId, value);
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
  return items.map((item) => ({
    ...item,
    gridCell: item.gridCell ? { ...item.gridCell } : undefined,
    locked: item.locked === true,
    lockJudgement: item.lockJudgement || "",
    lockJudgementLabel: item.lockJudgementLabel || "",
  }));
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
    traitId: defaultRecipe?.traitId || defaultRecipe?.specialEventId || config.defaultTraitId || "none",
    cookingEffectMode: getInitialCookingEffectMode(),
    level: focusSelection.level,
    toolId: focusSelection.toolId,
    toolStars: focusSelection.toolStars,
    focus: calculateFocus(config, focusSelection),
    heat: config.heatStates[0].id,
    targetMode: config.targetMode || "fixed",
    techniques: cloneConfigItems(config.techniques),
    ingredients: cloneConfigItems(defaultRecipe?.items || config.items),
    miracleGrillUsed: false,
    miracleGrillResult: "",
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
    cookingEffectMode: state.cookingEffectMode,
    miracleGrillUsed: state.miracleGrillUsed,
    miracleGrillResult: state.miracleGrillResult,
  };
}

function restoreBoardSnapshot(snapshot) {
  state.ingredients = snapshot.ingredients.map((ingredient) => ({
    ...ingredient,
    gridCell: ingredient.gridCell ? { ...ingredient.gridCell } : undefined,
  }));
  state.cookingEffectMode = normalizeCookingEffectMode(state.traitId, snapshot.cookingEffectMode);
  state.miracleGrillUsed = snapshot.miracleGrillUsed === true;
  state.miracleGrillResult = snapshot.miracleGrillResult || "";
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
  renderTraitOptions();
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
  elements.recipeTraitInput.value = state.traitId;
  elements.levelSelect.value = state.level;
  elements.toolSelect.value = state.toolId;
  elements.toolStarsSelect.value = state.toolStars;
  elements.focusInput.value = state.focus;
  elements.heatInput.value = state.heat;
}

function renderRecipeOptions() {
  const config = getCurrentCraftConfig();
  const recipes = getCraftRecipes(config.id);
  const showCustomRecipeOption = shouldShowCustomRecipeOption(config);
  elements.recipeSelect.replaceChildren();

  recipes.forEach((recipe) => {
    const option = document.createElement("option");
    option.value = recipe.id;
    option.textContent = recipe.name;
    elements.recipeSelect.append(option);
  });

  if (showCustomRecipeOption) {
    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "手入力";
    elements.recipeSelect.append(customOption);
  }

  elements.recipeSelect.disabled = recipes.length === 0 && !showCustomRecipeOption;
  elements.recipeSelect.value = recipes.some((recipe) => recipe.id === state.recipeId)
    ? state.recipeId
    : showCustomRecipeOption
      ? "custom"
      : "";
}

function renderTraitOptions() {
  const config = getCurrentCraftConfig();
  const traits = getTraits(config);
  const shouldShow = traits.length > 0;
  elements.recipeTraitLabel.hidden = !shouldShow;

  if (!shouldShow) {
    return;
  }

  state.traitId = normalizeTraitId(config, state.traitId);
  elements.recipeTraitInput.replaceChildren();
  traits.forEach((trait) => {
    const option = document.createElement("option");
    option.value = trait.id;
    option.textContent = trait.label;
    elements.recipeTraitInput.append(option);
  });

  elements.recipeTraitInput.value = state.traitId;
  renderTraitDescription();
}

function renderTraitDescription() {
  const config = getCurrentCraftConfig();
  const trait = getTrait(config, state.traitId);
  elements.recipeTraitDescription.textContent = trait?.description || "";
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
  elements.focusLabel.textContent = config.resourceLabel;
  elements.stateLabel.textContent = config.stateLabel || "火力状態";
  elements.focusNote.textContent = config.focusNote || "";
  elements.focusNote.hidden = !config.focusNote;
  elements.itemSectionTitle.textContent = config.itemSectionTitle;
  elements.layoutSectionTitle.textContent = config.layout?.label || `${config.label}配置`;
  elements.itemNameHeader.textContent = config.itemNameLabel;
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
    const multiplierRow = card.querySelector(".tech-multiplier")?.closest(".technique-value");
    card.dataset.id = technique.id;
    card.querySelector(".technique-title").textContent = technique.name;
    card.querySelector(".tech-focus").textContent = resolvedTechnique.focusCost;
    if (config.id === "cooking" && multiplierRow) {
      multiplierRow.hidden = true;
    }
    if (technique.specialAction === "miracle-grill") {
      card.querySelector(".tech-normal-range").textContent = "理想値";
      card.querySelector(".tech-critical-range").textContent = "確定";
      card.querySelector(".tech-multiplier").textContent = "必殺";
    } else {
      card.querySelector(".tech-normal-range").textContent = `${resolvedTechnique.normalMin} - ${resolvedTechnique.normalMax}`;
      card.querySelector(".tech-critical-range").textContent = `${resolvedTechnique.criticalMin} - ${resolvedTechnique.criticalMax}`;
      card.querySelector(".tech-multiplier").textContent = `${resolvedTechnique.multiplier || 1}倍`;
    }
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

  renderRecipeTraitReference(config);
  renderCookingDamageRanges(cookingDamage);
}

function renderRecipeTraitReference(config) {
  const trait = getTrait(config, state.traitId);
  elements.recipeTraitReference.innerHTML = `
    <div class="reference-row trait-reference">
      <strong>${escapeHtml(trait?.label || "-")}</strong>
      <span>${escapeHtml(trait?.description || "-")}</span>
    </div>
  `;
}

function renderCookingDamageRanges(cookingDamage) {
  const heatLabels = {
    normal: "通常",
    strong: "強火焼き",
    half: "弱火焼き",
  };
  const positionRows = cookingDamage.positions.map((position) => {
    const ranges = ["normal", "strong", "half"].map((conditionId) => {
      const range = cookingDamage.getRange(position.id, conditionId);
      const values = cookingDamage.distributions?.[position.id]?.[conditionId] || range;
      return `${heatLabels[conditionId]} ${values ? values.join("/") : "-"}`;
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
      const range = cookingDamage.getSpecialRange
        ? cookingDamage.getSpecialRange(specialRange.id, conditionId)
        : specialRange.ranges?.[conditionId] || specialRange.range;
      return `${heatLabels[conditionId]} ${range ? `${range[0]}-${range[1]}` : "-"}`;
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
    bindIngredientOption(row.querySelector(".ingredient-option"), ingredient.id, ingredient.optionId);
    bindIngredientNumber(row.querySelector(".ingredient-current"), ingredient.id, "current", ingredient.current);
    bindIngredientBoolean(row.querySelector(".ingredient-glowing"), ingredient.id, "isGlowing", ingredient.isGlowing);
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
  const selectedRecipe = getSelectedRecipe(config, state.recipeId);
  const visualContext = getCookingIngredientVisualContext(selectedRecipe);
  const occupiedCells = new Set();
  const canRearrange = canRearrangeBoard(config);
  const selectedIngredient = state.ingredients.find((ingredient) => ingredient.id === selectedBoardIngredientId);
  const selectedGroupId = getIngredientGroupId(selectedIngredient);

  elements.layoutBoard.replaceChildren();
  elements.layoutBoard.classList.remove("square-board");
  elements.layoutBoard.style.gridTemplateColumns = `repeat(${columns}, minmax(110px, 1fr))`;
  elements.layoutBoard.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

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

      const special = getIngredientSpecialState(item);

      if (special.isGlowing) {
        cell.classList.add("glowing");
      }
      if (special.isReturning) {
        cell.classList.add("returning");
      }

      const rowSpan = Math.max(1, numberOr(item.gridCell?.rowSpan, 1));
      const columnSpan = Math.max(1, numberOr(item.gridCell?.columnSpan, 1));
      cell.style.gridRow = `span ${rowSpan}`;
      cell.style.gridColumn = `span ${columnSpan}`;
      cell.dataset.id = item.id;
      if (item.id === selectedBoardIngredientId || isSameIngredientGroup(item, selectedGroupId)) {
        cell.classList.add("selected");
      }

      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
          occupiedCells.add(`${rowIndex + rowOffset}:${columnIndex + columnOffset}`);
        }
      }

      const ingredientVisual = getCookingIngredientVisual(item, visualContext);
      if (ingredientVisual) {
        cell.classList.add("has-ingredient-visual", `ingredient-${ingredientVisual.id}`);
      }

      cell.innerHTML = `
        <div class="board-cell-head">
          <strong>${escapeHtml(item.name)}</strong>
          <div class="board-cell-badges">
            ${special.isGlowing ? '<span class="glow-badge">光</span>' : ""}
            ${special.isReturning ? '<span class="return-badge">戻</span>' : ""}
            ${formatLockBadge(item)}
            ${formatBoardBadge(item.ingredientGroupLabel)}
            ${ingredientVisual?.isInferred ? formatBoardBadge("推定") : ""}
            ${formatBoardBadge(getItemOptionLabel(config, item.optionId))}
          </div>
        </div>
        ${formatCookingIngredientVisual(ingredientVisual)}
        <div class="board-cell-values">
          <span class="numeric">${item.current}</span>
          <small class="numeric">${escapeHtml(formatBoardTargetSummary(item, state.targetMode))}</small>
        </div>
        ${formatCookingLightToggle(item, special)}
        <span class="status status-${item.status}">${escapeHtml(item.statusLabel)}</span>
      `;
      const lightToggle = cell.querySelector(".board-light-toggle");
      if (lightToggle) {
        lightToggle.addEventListener("click", (event) => {
          event.stopPropagation();
          toggleCookingLight(item.id);
        });
      }
      cell.addEventListener("click", () => {
        if (canRearrange) {
          handleBoardCellClick(item, { row: rowIndex, column: columnIndex });
          return;
        }

        focusIngredientRow(item.id);
      });
      if (state.craftType === "cooking") {
        cell.addEventListener("contextmenu", (event) => openBoardCellEditor(event, item));
      }
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
  const selectedIngredient = canRearrange
    ? state.ingredients.find((ingredient) => ingredient.id === selectedBoardIngredientId)
    : null;
  elements.boardActions.hidden = !canRearrange;
  elements.undoBoardButton.disabled = !canRearrange || undoStack.length === 0;
  elements.redoBoardButton.disabled = !canRearrange || redoStack.length === 0;
  elements.shiftBoardUpButton.disabled = !canRearrange || state.ingredients.length === 0;
  syncMiracleGrillButton(canRearrange, selectedIngredient);
  elements.swapBoardUpButton.disabled = !selectedIngredient || !canSwapBoardDirection("up");
  elements.swapBoardDownButton.disabled = !selectedIngredient || !canSwapBoardDirection("down");
  elements.swapBoardLeftButton.disabled = !selectedIngredient || !canSwapBoardDirection("left");
  elements.swapBoardRightButton.disabled = !selectedIngredient || !canSwapBoardDirection("right");
  syncCookingEffectButtons();
}

function syncMiracleGrillButton(canRearrange, selectedIngredient) {
  if (!elements.miracleGrillButton) {
    return;
  }

  const isCooking = state?.craftType === "cooking";
  elements.miracleGrillButton.hidden = !isCooking;
  elements.miracleGrillButton.disabled = !canRearrange || !selectedIngredient || state.miracleGrillUsed === true;
  elements.miracleGrillButton.classList.toggle("active", state.miracleGrillUsed === true);

  if (elements.miracleGrillResult) {
    elements.miracleGrillResult.hidden = !isCooking || !state.miracleGrillResult;
    elements.miracleGrillResult.textContent = state.miracleGrillResult || "";
  }
}

function syncCookingEffectButtons() {
  const buttonState = DQ10CookingEffects.getCookingEffectButtonState(state);
  syncCookingEffectButton(elements.clearCookingLightButton, buttonState.clearLight);
  syncCookingEffectButton(elements.clearCookingEffectButton, buttonState.clearEffect);
  syncCookingEffectButton(elements.crossGlowButton, buttonState.crossGlow);
  syncCookingEffectButton(elements.cornerReturnButton, buttonState.cornerReturn);

  const heatButtonState = DQ10CookingEffects.getCookingHeatButtonState(state);
  syncCookingEffectButton(elements.normalHeatButton, heatButtonState.normal);
  syncCookingEffectButton(elements.strongHeatButton, heatButtonState.strong);
  syncCookingEffectButton(elements.halfHeatButton, heatButtonState.half);
}

function syncCookingEffectButton(button, buttonState) {
  button.hidden = buttonState.hidden;
  button.disabled = buttonState.disabled;
  button.classList.toggle("active", buttonState.active);
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

  const selectedGroup = getIngredientGroupMembers(selectedIngredient);
  const targetGroup = targetIngredient ? getIngredientGroupMembers(targetIngredient) : [];
  const selectedGroupIds = new Set(selectedGroup.map((ingredient) => ingredient.id));
  const targetGroupIds = new Set(targetGroup.map((ingredient) => ingredient.id));

  if (targetIngredient && selectedGroupIds.has(targetIngredient.id)) {
    selectedBoardIngredientId = null;
    renderLayoutBoard();
    return;
  }

  const targetDirection = getAdjacentDirectionForCell(selectedGroup, targetCell);
  let moves = null;
  let ignoredIds = null;

  if (targetDirection) {
    moves = createDirectionalSwapMoves(selectedGroup, targetDirection);
    ignoredIds = moves ? new Set(moves.map((move) => move.ingredient.id)) : new Set();
  } else if (targetIngredient) {
    moves = [
      ...createSwapGroupMoves(selectedGroup, targetGroup),
    ];
    ignoredIds = new Set([...selectedGroupIds, ...targetGroupIds]);
  } else {
    moves = createGroupMoves(selectedGroup, selectedIngredient, targetCell);
    ignoredIds = new Set([...selectedGroupIds, ...targetGroupIds]);
  }

  if (!moves) {
    renderLayoutBoard();
    return;
  }

  if (!canApplyGroupMoves(moves, ignoredIds)) {
    renderLayoutBoard();
    return;
  }

  pushBoardHistory();
  applyGroupMoves(moves);
  selectedBoardIngredientId = null;
  markCustomRecipe();
  renderIngredients();
  renderLayoutBoard();
  renderCraftReference();
  renderAnalysis();
  saveState();
}

function createMovedGridCell(currentCell, targetCell) {
  return DQ10BoardLayout.createMovedGridCell(currentCell, targetCell);
}

function getIngredientGroupId(ingredient) {
  return DQ10BoardLayout.getIngredientGroupId(ingredient);
}

function isSameIngredientGroup(ingredient, groupId) {
  return DQ10BoardLayout.isSameIngredientGroup(ingredient, groupId);
}

function getIngredientGroupMembers(ingredient) {
  return DQ10BoardLayout.getIngredientGroupMembers(state.ingredients, ingredient);
}

function createGroupMoves(group, anchorIngredient, targetCell) {
  return DQ10BoardLayout.createGroupMoves(group, anchorIngredient, targetCell);
}

function createSwapGroupMoves(selectedGroup, targetGroup) {
  return DQ10BoardLayout.createSwapGroupMoves(selectedGroup, targetGroup);
}

function createDirectionalSwapMoves(selectedGroup, direction) {
  return DQ10BoardLayout.createDirectionalSwapMoves(state.ingredients, selectedGroup, direction);
}

function getAdjacentDirectionForCell(group, targetCell) {
  return DQ10BoardLayout.getAdjacentDirectionForCell(group, targetCell);
}

function canApplyGroupMoves(moves, ignoredIds) {
  return DQ10BoardLayout.canApplyGroupMoves(
    state.ingredients,
    moves,
    ignoredIds,
    getCurrentCraftConfig().layout,
  );
}

function getBoardDirectionSwap(direction) {
  const selectedIngredient = state.ingredients.find((ingredient) => ingredient.id === selectedBoardIngredientId);
  if (!selectedIngredient) {
    return null;
  }

  const selectedGroup = getIngredientGroupMembers(selectedIngredient);
  const moves = createDirectionalSwapMoves(selectedGroup, direction);
  if (!moves) {
    return null;
  }

  const ignoredIds = new Set(moves.map((move) => move.ingredient.id));
  if (!canApplyGroupMoves(moves, ignoredIds)) {
    return null;
  }

  return { moves, ignoredIds };
}

function canSwapBoardDirection(direction) {
  return Boolean(getBoardDirectionSwap(direction));
}

function applyGroupMoves(moves) {
  moves.forEach((move) => {
    move.ingredient.gridCell = move.gridCell;
    updateIngredientPositionOption(move.ingredient);
  });
}

function applyMiracleGrillToSelected() {
  if (state.craftType !== "cooking" || state.miracleGrillUsed === true) {
    return;
  }

  const ingredient = state.ingredients.find((item) => item.id === selectedBoardIngredientId);
  if (!ingredient) {
    return;
  }

  const targets = getIngredientGroupMembers(ingredient);
  pushBoardHistory();
  const result = DQ10CraftEngine.applyMiracleGrillToIngredients(targets, state);
  state.miracleGrillUsed = true;
  state.miracleGrillResult = formatMiracleGrillResult(targets, result);
  selectedBoardIngredientId = null;
  renderIngredients();
  renderLayoutBoard();
  renderAnalysis();
  saveState();
}

function formatMiracleGrillResult(targets, result) {
  const targetLabel = targets.length > 1
    ? `${targets[0].ingredientGroupLabel || targets[0].name} ${targets.length}マス`
    : targets[0].name;
  const lockLabels = [...new Set(result.results
    .filter((item) => item.outcome === "hit")
    .map((item) => item.lockJudgementLabel)
    .filter(Boolean))];

  if (result.missCount > 0 && result.hitCount > 0) {
    return `${targetLabel}: ミラクルグリル一部成功 / miss ${result.missCount}マス`;
  }

  if (result.missCount > 0) {
    return `${targetLabel}: ミラクルグリル miss / 理想値超過`;
  }

  return `${targetLabel}: ミラクルグリル成功 / ${lockLabels.join("・") || "固定"}`;
}

function swapBoardDirection(direction) {
  if (!canRearrangeBoard()) {
    return;
  }

  const swap = getBoardDirectionSwap(direction);
  if (!swap) {
    return;
  }

  pushBoardHistory();
  applyGroupMoves(swap.moves);
  markCustomRecipe();
  renderIngredients();
  renderLayoutBoard();
  renderCraftReference();
  renderAnalysis();
  saveState();
}

function clearCookingLight() {
  if (state.traitId !== "light") {
    return;
  }

  if (!state.ingredients.some((ingredient) => ingredient.isGlowing === true)) {
    return;
  }

  pushBoardHistory();
  DQ10CookingEffects.clearCookingLight(state.ingredients);
  renderIngredients();
  renderLayoutBoard();
  renderAnalysis();
  saveState();
}

function setCookingEffectMode(mode) {
  if (state.traitId !== "light-return") {
    return;
  }

  const nextMode = normalizeCookingEffectMode(state.traitId, mode);
  if (state.cookingEffectMode === nextMode) {
    return;
  }

  pushBoardHistory();
  state.cookingEffectMode = nextMode;
  renderLayoutBoard();
  renderCraftReference();
  renderAnalysis();
  saveState();
}

function setCookingHeatMode(mode) {
  if (state.craftType !== "cooking") {
    return;
  }

  const config = getCurrentCraftConfig();
  const isSupportedHeat = config.heatStates.some((heatState) => heatState.id === mode);
  if (!isSupportedHeat || state.heat === mode) {
    return;
  }

  state.heat = mode;
  elements.heatInput.value = mode;
  renderTechniqueEditor();
  renderIngredients();
  renderAnalysis();
  syncBoardActionButtons();
  saveState();
}

function toggleCookingLight(ingredientId) {
  if (state.traitId !== "light") {
    return;
  }

  if (!state.ingredients.some((ingredient) => ingredient.id === ingredientId)) {
    return;
  }

  pushBoardHistory();
  DQ10CookingEffects.toggleCookingLight(state.ingredients, ingredientId);
  renderIngredients();
  renderLayoutBoard();
  renderAnalysis();
  saveState();
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

function formatBoardTargetSummary(item, targetMode) {
  if (targetMode === "random-in-range") {
    return `基準 ${item.successMin}-${item.successMax}`;
  }

  return `基準 ${item.target} / ${item.successMin}-${item.successMax}`;
}

function getItemOptionLabel(config, optionId) {
  const option = config.itemOptions?.find((itemOption) => itemOption.id === optionId);
  return option?.label || "";
}

function getIngredientSpecialState(ingredient) {
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

function formatBoardBadge(label) {
  return label ? `<span>${escapeHtml(label)}</span>` : "";
}

function formatLockBadge(item) {
  if (!item.locked) {
    return "";
  }

  return `<span class="locked-badge">${escapeHtml(item.lockJudgementLabel || "固定")}</span>`;
}

function formatCookingLightToggle(item, special) {
  if (state.craftType !== "cooking" || state.traitId !== "light") {
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

function getCookingIngredientVisual(ingredient, recipe) {
  if (state.craftType !== "cooking") {
    return null;
  }

  return window.DQ10CookingIngredients?.getCookingIngredientVisual(ingredient, recipe) || null;
}

function getCookingIngredientVisualContext(recipe) {
  return window.DQ10CookingIngredients?.getCookingIngredientVisualContext(recipe, state) || recipe || null;
}

function formatCookingIngredientVisual(visual) {
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

function focusIngredientRow(id) {
  const row = elements.ingredientBody.querySelector(`tr[data-id="${CSS.escape(id)}"]`);
  const input = row?.querySelector(".ingredient-current");

  if (input) {
    input.focus();
  }
}

function getBoardCellEditorElement() {
  if (boardCellEditorElement) {
    return boardCellEditorElement;
  }

  const editor = document.createElement("div");
  editor.className = "board-cell-editor";
  editor.hidden = true;
  editor.innerHTML = `
    <form>
      <strong class="editor-title"></strong>
      <label>
        現在値
        <input class="editor-current numeric" type="number" />
      </label>
      <label class="checkbox-field">
        <input class="editor-glowing" type="checkbox" />
        <span>光っている</span>
      </label>
      <fieldset class="editor-effect-mode">
        <legend>光・戻り</legend>
        <label class="checkbox-field">
          <input name="editorEffectMode" type="radio" value="none" />
          <span>効果なし</span>
        </label>
        <label class="checkbox-field">
          <input name="editorEffectMode" type="radio" value="cross-glow" />
          <span>上下左右が光る</span>
        </label>
        <label class="checkbox-field">
          <input name="editorEffectMode" type="radio" value="corner-return" />
          <span>四隅が戻り</span>
        </label>
      </fieldset>
      <div class="editor-actions">
        <button class="button primary" type="submit">更新</button>
        <button class="button secondary editor-cancel" type="button">閉じる</button>
      </div>
    </form>
  `;

  editor.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    applyBoardCellEditor(editor);
  });
  editor.querySelector(".editor-cancel").addEventListener("click", closeBoardCellEditor);
  document.body.append(editor);
  boardCellEditorElement = editor;
  return editor;
}

function openBoardCellEditor(event, item) {
  event.preventDefault();
  event.stopPropagation();

  const editor = getBoardCellEditorElement();
  editor.dataset.id = item.id;
  editor.querySelector(".editor-title").textContent = `${item.name}を編集`;
  editor.querySelector(".editor-current").value = item.current;
  editor.querySelector(".editor-glowing").checked = item.isGlowing === true;
  syncBoardCellEditorTrait(editor);
  editor.hidden = false;
  positionBoardCellEditor(editor, event.clientX, event.clientY);
  editor.querySelector(".editor-current").focus();
  editor.querySelector(".editor-current").select();
}

function syncBoardCellEditorTrait(editor) {
  const glowField = editor.querySelector(".checkbox-field");
  const effectModeField = editor.querySelector(".editor-effect-mode");
  glowField.hidden = state.traitId !== "light";
  effectModeField.hidden = state.traitId !== "light-return";

  effectModeField.querySelectorAll("input").forEach((input) => {
    input.checked = input.value === state.cookingEffectMode;
  });
}

function positionBoardCellEditor(editor, x, y) {
  const margin = 12;
  const rect = editor.getBoundingClientRect();
  const left = Math.min(x, window.innerWidth - rect.width - margin);
  const top = Math.min(y, window.innerHeight - rect.height - margin);
  editor.style.left = `${Math.max(margin, left)}px`;
  editor.style.top = `${Math.max(margin, top)}px`;
}

function closeBoardCellEditor() {
  if (boardCellEditorElement) {
    boardCellEditorElement.hidden = true;
  }
}

function applyBoardCellEditor(editor) {
  const ingredient = state.ingredients.find((item) => item.id === editor.dataset.id);

  if (!ingredient) {
    closeBoardCellEditor();
    return;
  }

  const normalized = DQ10BoardCellEditor.normalizeEditValue(ingredient, {
    current: editor.querySelector(".editor-current").value,
    isGlowing: state.traitId === "light" && editor.querySelector(".editor-glowing").checked,
    cookingEffectMode: editor.querySelector("[name='editorEffectMode']:checked")?.value,
  });
  const willChangeEffect =
    (state.traitId === "light" && ingredient.isGlowing !== normalized.isGlowing) ||
    (state.traitId === "light-return" && state.cookingEffectMode !== normalizeCookingEffectMode(state.traitId, normalized.cookingEffectMode));

  if (willChangeEffect) {
    pushBoardHistory();
  }

  if (ingredient.current !== normalized.current) {
    ingredient.locked = false;
    ingredient.lockJudgement = "";
    ingredient.lockJudgementLabel = "";
  }
  ingredient.current = normalized.current;
  ingredient.isGlowing = normalized.isGlowing;
  state.cookingEffectMode = normalizeCookingEffectMode(state.traitId, normalized.cookingEffectMode);
  refreshIngredientRow(ingredient.id);
  renderLayoutBoard();
  renderCraftReference();
  renderAnalysis();
  saveState();
  closeBoardCellEditor();
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

function bindIngredientBoolean(input, id, key, value) {
  const enabled = state.traitId === "light";
  input.checked = value === true;
  input.disabled = !enabled;
  input.hidden = !enabled;
  input.title = enabled ? "光っている" : "このレシピ特性では個別の光状態を使いません";
  input.addEventListener("change", () => {
    updateIngredient(id, key, input.checked);
  });
}

function updateIngredient(id, key, value) {
  const ingredient = state.ingredients.find((item) => item.id === id);

  if (!ingredient) {
    return;
  }

  ingredient[key] = value;
  if (key === "current") {
    ingredient.locked = false;
    ingredient.lockJudgement = "";
    ingredient.lockJudgementLabel = "";
  }
  if (key !== "current" && key !== "isGlowing") {
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
  row.querySelector(".ingredient-current").value = ingredient.current;
  row.querySelector(".ingredient-glowing").checked = ingredient.isGlowing === true;
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
    optionId: getBoardOptionId(gridCell.row, gridCell.column) || config.itemOptions?.[0]?.id || "",
    gridCell,
    current: 0,
    isGlowing: false,
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
  state.recipeCategory = recipe.category || "";
  state.recipeCategoryId = recipe.categoryId || "";
  state.traitId = normalizeTraitId(config, recipe.traitId || recipe.specialEventId || config.defaultTraitId || "none");
  state.cookingEffectMode = getInitialCookingEffectMode(state.traitId);
  state.ingredients = cloneConfigItems(recipe.items);
  state.miracleGrillUsed = false;
  state.miracleGrillResult = "";
  state.layoutSignature = createLayoutSignature(config);
  render();
}

function markCustomRecipe() {
  state.recipeId = "custom";
  if (elements.recipeSelect) {
    elements.recipeSelect.value = "custom";
  }
}

function createResetStateForCurrentSelection() {
  const config = getCurrentCraftConfig();
  const recipes = getCraftRecipes(config.id);
  const resetRecipe = window.DQ10StateReset?.findResetRecipe(recipes, state) || null;
  const focusSelection = normalizeFocusSelection(
    config,
    window.DQ10StateReset?.getResetFocusSelection(state) || state,
  );
  const traitId = normalizeTraitId(
    config,
    resetRecipe?.traitId || resetRecipe?.specialEventId || state.traitId || config.defaultTraitId || "none",
  );

  return normalizeState({
    craftType: config.id,
    recipeId: resetRecipe?.id || state.recipeId || "custom",
    recipeName: resetRecipe?.name || state.recipeName || config.defaultRecipeName,
    recipeCategory: resetRecipe?.category || state.recipeCategory || "",
    recipeCategoryId: resetRecipe?.categoryId || state.recipeCategoryId || "",
    traitId,
    cookingEffectMode: getInitialCookingEffectMode(traitId),
    level: focusSelection.level,
    toolId: focusSelection.toolId,
    toolStars: focusSelection.toolStars,
    focus: calculateFocus(config, focusSelection),
    heat: config.heatStates[0].id,
    targetMode: config.targetMode || "fixed",
    techniques: cloneConfigItems(config.techniques),
    ingredients: cloneConfigItems(resetRecipe?.items || config.items),
    miracleGrillUsed: false,
    miracleGrillResult: "",
  });
}

function resetState() {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(legacyStorageKey);
  clearBoardHistory();
  state = createResetStateForCurrentSelection();
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

elements.recipeTraitInput.addEventListener("change", () => {
  const config = getCurrentCraftConfig();
  state.traitId = normalizeTraitId(config, elements.recipeTraitInput.value);
  state.cookingEffectMode = getInitialCookingEffectMode(state.traitId);
  if (state.traitId !== "light") {
    state.ingredients.forEach((ingredient) => {
      ingredient.isGlowing = false;
    });
  }
  markCustomRecipe();
  renderIngredients();
  renderLayoutBoard();
  renderTraitDescription();
  renderCraftReference();
  renderAnalysis();
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
  syncBoardActionButtons();
  saveState();
});
elements.addIngredientButton.addEventListener("click", addIngredient);
elements.undoBoardButton.addEventListener("click", undoBoardAction);
elements.redoBoardButton.addEventListener("click", redoBoardAction);
elements.shiftBoardUpButton.addEventListener("click", shiftBoardUp);
elements.miracleGrillButton.addEventListener("click", applyMiracleGrillToSelected);
elements.normalHeatButton.addEventListener("click", () => setCookingHeatMode("normal"));
elements.strongHeatButton.addEventListener("click", () => setCookingHeatMode("strong"));
elements.halfHeatButton.addEventListener("click", () => setCookingHeatMode("half"));
elements.clearCookingLightButton.addEventListener("click", clearCookingLight);
elements.clearCookingEffectButton.addEventListener("click", () => setCookingEffectMode("none"));
elements.crossGlowButton.addEventListener("click", () => setCookingEffectMode("cross-glow"));
elements.cornerReturnButton.addEventListener("click", () => setCookingEffectMode("corner-return"));
elements.swapBoardUpButton.addEventListener("click", () => swapBoardDirection("up"));
elements.swapBoardDownButton.addEventListener("click", () => swapBoardDirection("down"));
elements.swapBoardLeftButton.addEventListener("click", () => swapBoardDirection("left"));
elements.swapBoardRightButton.addEventListener("click", () => swapBoardDirection("right"));
elements.exportButton.addEventListener("click", exportState);
elements.resetButton.addEventListener("click", resetState);
elements.importInput.addEventListener("change", importState);
elements.captureButton.addEventListener("click", startCapturePreview);
document.addEventListener("pointerdown", (event) => {
  if (boardCellEditorElement && !boardCellEditorElement.hidden && !boardCellEditorElement.contains(event.target)) {
    closeBoardCellEditor();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeBoardCellEditor();
    return;
  }

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
