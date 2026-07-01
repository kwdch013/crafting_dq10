const storageKey = "dq10-craft-support-mvp";
const legacyStorageKey = "dq10-cooking-craft-mvp";
const apiBaseUrl = window.DQ10_API_BASE_URL || "http://localhost:8000";

const elements = {
  modeLabel: document.querySelector("#modeLabel"),
  craftType: document.querySelector("#craftType"),
  recipeNameLabel: document.querySelector("#recipeNameLabel span"),
  focusLabel: document.querySelector("#focusLabel span"),
  turnLabel: document.querySelector("#turnLabel span"),
  stateLabel: document.querySelector("#stateLabel span"),
  recipeTraitLabel: document.querySelector("#recipeTraitLabel"),
  recipeName: document.querySelector("#recipeName"),
  recipeSelect: document.querySelector("#recipeSelect"),
  recipeTraitSelect: document.querySelector("#recipeTraitSelect"),
  levelSelect: document.querySelector("#levelSelect"),
  toolSelect: document.querySelector("#toolSelect"),
  toolStarsSelect: document.querySelector("#toolStarsSelect"),
  focusInput: document.querySelector("#focusInput"),
  turnInput: document.querySelector("#turnInput"),
  heatInput: document.querySelector("#heatInput"),
  techniqueSelect: document.querySelector("#techniqueSelect"),
  itemSectionTitle: document.querySelector("#itemSectionTitle"),
  itemNameHeader: document.querySelector("#itemNameHeader"),
  itemOptionHeader: document.querySelector("#itemOptionHeader"),
  techniqueEditor: document.querySelector("#techniqueEditor"),
  layoutSectionTitle: document.querySelector("#layoutSectionTitle"),
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
  selectedTechniqueLabel: document.querySelector("#selectedTechniqueLabel"),
  recommendationList: document.querySelector("#recommendationList"),
};

let state;
let boardCellEditorElement;

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
      isGlowing: ingredient.isGlowing === true,
      target: numberOr(ingredient.target, defaultItem?.target ?? Math.round((successMin + successMax) / 2)),
      successMin,
      successMax,
    };
  });
  const selectedTechniqueId = techniques.some((technique) => technique.id === value.selectedTechniqueId)
    ? value.selectedTechniqueId
    : techniques[0].id;
  const heat = config.heatStates.some((candidate) => candidate.id === value.heat)
    ? value.heat
    : config.heatStates[0].id;
  const recipeTrait = normalizeRecipeTrait(config, value.recipeTrait || selectedRecipe?.recipeTrait);
  const focusSelection = normalizeFocusSelection(config, value);

  return {
    recipeId,
    recipeName: value.recipeName || getRecipeLabel(config, recipeId),
    recipeTrait,
    cookingEffectMode: normalizeCookingEffectMode(recipeTrait, value.cookingEffectMode),
    craftType: config.id,
    level: focusSelection.level,
    toolId: focusSelection.toolId,
    toolStars: focusSelection.toolStars,
    focus: calculateFocus(config, focusSelection),
    turns: numberOr(value.turns, config.defaultTurns),
    heat,
    layoutSignature,
    selectedTechniqueId,
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

function normalizeRecipeTrait(config, value) {
  const traits = config.recipeTraits || [{ id: "none", label: "なし" }];
  return traits.some((trait) => trait.id === value)
    ? value
    : config.defaultRecipeTrait || traits[0].id;
}

function normalizeCookingEffectMode(recipeTrait, value) {
  if (recipeTrait !== "glow-return") {
    return "none";
  }

  return value === "corner-return" ? "corner-return" : "cross-glow";
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
    recipeTrait: defaultRecipe?.recipeTrait || config.defaultRecipeTrait,
    level: focusSelection.level,
    toolId: focusSelection.toolId,
    toolStars: focusSelection.toolStars,
    focus: calculateFocus(config, focusSelection),
    turns: config.defaultTurns,
    heat: config.heatStates[0].id,
    cookingEffectMode: "none",
    selectedTechniqueId: config.techniques[0].id,
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

function render() {
  renderCraftOptions();
  renderCraftLabels();
  syncStaticInputs();
  renderRecipeOptions();
  renderRecipeTraitOptions();
  renderFocusOptions();
  renderHeatOptions();
  renderTechniqueOptions();
  renderTechniqueEditor();
  renderIngredients();
  renderLayoutBoard();
  renderAnalysis();
  saveState();
}

function syncStaticInputs() {
  elements.craftType.value = state.craftType;
  elements.recipeSelect.value = state.recipeId;
  elements.recipeTraitSelect.value = state.recipeTrait;
  elements.recipeName.value = state.recipeName;
  elements.levelSelect.value = state.level;
  elements.toolSelect.value = state.toolId;
  elements.toolStarsSelect.value = state.toolStars;
  elements.focusInput.value = state.focus;
  elements.turnInput.value = state.turns;
  elements.heatInput.value = state.heat;
}

function renderRecipeOptions() {
  const config = getCurrentCraftConfig();
  const recipes = getCraftRecipes(config.id);
  elements.recipeSelect.replaceChildren();

  recipes.forEach((recipe) => {
    const option = document.createElement("option");
    option.value = recipe.id;
    option.textContent = recipe.name;
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

function renderRecipeTraitOptions() {
  const config = getCurrentCraftConfig();
  const traits = config.recipeTraits || [{ id: "none", label: "なし" }];
  elements.recipeTraitSelect.replaceChildren();

  traits.forEach((trait) => {
    const option = document.createElement("option");
    option.value = trait.id;
    option.textContent = trait.label;
    elements.recipeTraitSelect.append(option);
  });

  elements.recipeTraitSelect.value = normalizeRecipeTrait(config, state.recipeTrait);
  elements.recipeTraitLabel.hidden = traits.length <= 1 && traits[0].id === "none";
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
  elements.turnLabel.textContent = config.turnLabel;
  elements.stateLabel.textContent = config.stateLabel || "火力状態";
  elements.itemSectionTitle.textContent = config.itemSectionTitle;
  elements.layoutSectionTitle.textContent = config.layout?.label || `${config.label}配置`;
  elements.itemNameHeader.textContent = config.itemNameLabel;
  elements.itemOptionHeader.textContent = config.itemOptionLabel || "種別";
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

function renderTechniqueOptions() {
  const currentValue = elements.techniqueSelect.value || state.selectedTechniqueId;
  elements.techniqueSelect.replaceChildren();

  state.techniques.forEach((technique) => {
    const option = document.createElement("option");
    option.value = technique.id;
    option.textContent = technique.name;
    elements.techniqueSelect.append(option);
  });

  elements.techniqueSelect.value = state.techniques.some((technique) => technique.id === currentValue)
    ? currentValue
    : state.techniques[0].id;
  state.selectedTechniqueId = elements.techniqueSelect.value;
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
    bindIngredientNumber(row.querySelector(".ingredient-target"), ingredient.id, "target", ingredient.target);
    bindIngredientNumber(row.querySelector(".ingredient-min"), ingredient.id, "successMin", ingredient.successMin);
    bindIngredientNumber(row.querySelector(".ingredient-max"), ingredient.id, "successMax", ingredient.successMax);

    row.querySelector(".lower-diff").textContent = formatSigned(ingredient.lowerDiff);
    row.querySelector(".upper-diff").textContent = formatSigned(ingredient.upperDiff);
    row.querySelector(".normal-range").textContent = `${ingredient.normalAfterMin} - ${ingredient.normalAfterMax}`;
    row.querySelector(".critical-range").textContent = `${ingredient.criticalAfterMin} - ${ingredient.criticalAfterMax}`;

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

      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
          occupiedCells.add(`${rowIndex + rowOffset}:${columnIndex + columnOffset}`);
        }
      }

      cell.innerHTML = `
        <div class="board-cell-head">
          <strong>${escapeHtml(item.name)}</strong>
          <div class="board-cell-badges">
            ${special.isGlowing ? '<span class="glow-badge">光</span>' : ""}
            ${special.isReturning ? '<span class="return-badge">戻</span>' : ""}
            <span>${escapeHtml(getItemOptionLabel(config, item.optionId))}</span>
          </div>
        </div>
        <div class="board-cell-values">
          <span class="numeric">${item.current}</span>
          <small class="numeric">基準 ${item.target} / ${item.successMin} - ${item.successMax}</small>
        </div>
        <span class="status status-${item.status}">${escapeHtml(item.statusLabel)}</span>
      `;
      cell.addEventListener("click", () => focusIngredientRow(item.id));
      if (state.craftType === "cooking") {
        cell.addEventListener("contextmenu", (event) => openBoardCellEditor(event, item));
      }
      elements.layoutBoard.append(cell);
    }
  }
}

function getItemOptionLabel(config, optionId) {
  const option = config.itemOptions?.find((itemOption) => itemOption.id === optionId);
  return option?.label || "";
}

function getIngredientSpecialState(ingredient) {
  if (state.recipeTrait === "glow") {
    return {
      isGlowing: ingredient.isGlowing === true,
      isReturning: false,
    };
  }

  if (state.recipeTrait === "glow-return") {
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
  glowField.hidden = state.recipeTrait !== "glow";
  effectModeField.hidden = state.recipeTrait !== "glow-return";

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
    isGlowing: state.recipeTrait === "glow" && editor.querySelector(".editor-glowing").checked,
    cookingEffectMode: editor.querySelector("[name='editorEffectMode']:checked")?.value,
  });
  ingredient.current = normalized.current;
  ingredient.isGlowing = normalized.isGlowing;
  state.cookingEffectMode = normalizeCookingEffectMode(state.recipeTrait, normalized.cookingEffectMode);
  refreshIngredientRow(ingredient.id);
  renderLayoutBoard();
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
  const enabled = state.recipeTrait === "glow";
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
  if (key !== "current" && key !== "isGlowing") {
    markCustomRecipe();
  }
  refreshIngredientRow(id);
  renderLayoutBoard();
  renderAnalysis();
  saveState();
}

function refreshIngredientRow(id) {
  const ingredient = state.ingredients.find((item) => item.id === id);
  const selectedTechnique = state.techniques.find((item) => item.id === state.selectedTechniqueId) || state.techniques[0];
  const row = elements.ingredientBody.querySelector(`tr[data-id="${CSS.escape(id)}"]`);

  if (!ingredient || !selectedTechnique || !row) {
    return;
  }

  const technique = DQ10CraftEngine.resolveTechnique(state, selectedTechnique, ingredient);
  const analysis = DQ10CraftEngine.analyzeIngredient(ingredient, technique);
  row.querySelector(".ingredient-current").value = ingredient.current;
  row.querySelector(".ingredient-glowing").checked = ingredient.isGlowing === true;
  row.querySelector(".lower-diff").textContent = formatSigned(analysis.lowerDiff);
  row.querySelector(".upper-diff").textContent = formatSigned(analysis.upperDiff);
  row.querySelector(".normal-range").textContent = `${analysis.normalAfterMin} - ${analysis.normalAfterMax}`;
  row.querySelector(".critical-range").textContent = `${analysis.criticalAfterMin} - ${analysis.criticalAfterMax}`;

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
  elements.selectedTechniqueLabel.textContent = analysis.technique.name;

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
    optionId: config.itemOptions?.[0]?.id || "",
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

  if (!recipe) {
    state.recipeId = "custom";
    render();
    return;
  }

  state.recipeId = recipe.id;
  state.recipeName = recipe.name;
  state.recipeTrait = normalizeRecipeTrait(config, recipe.recipeTrait);
  state.cookingEffectMode = normalizeCookingEffectMode(state.recipeTrait, state.cookingEffectMode);
  state.ingredients = cloneConfigItems(recipe.items);
  state.layoutSignature = createLayoutSignature(config);
  render();
}

function updateRecipeTrait(value) {
  const config = getCurrentCraftConfig();
  state.recipeTrait = normalizeRecipeTrait(config, value);
  state.cookingEffectMode = normalizeCookingEffectMode(state.recipeTrait, state.cookingEffectMode);

  if (state.recipeTrait !== "glow") {
    state.ingredients.forEach((ingredient) => {
      ingredient.isGlowing = false;
    });
  }

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
elements.recipeSelect.addEventListener("change", () => {
  applyRecipe(elements.recipeSelect.value);
});
elements.recipeTraitSelect.addEventListener("change", () => {
  updateRecipeTrait(elements.recipeTraitSelect.value);
});
elements.craftType.addEventListener("change", () => {
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
elements.turnInput.addEventListener("input", () => {
  state.turns = numberOr(elements.turnInput.value, 0);
  saveState();
});
elements.heatInput.addEventListener("change", () => {
  state.heat = elements.heatInput.value;
  renderTechniqueEditor();
  renderIngredients();
  renderAnalysis();
  saveState();
});
elements.techniqueSelect.addEventListener("change", () => {
  state.selectedTechniqueId = elements.techniqueSelect.value;
  render();
});
elements.addIngredientButton.addEventListener("click", addIngredient);
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
  }
});

async function initialize() {
  await hydrateRecipesFromApi();
  state = loadState();
  render();
}

initialize();
