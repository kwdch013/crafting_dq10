(function (global) {
  function numberOr(value, fallback = 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function getIngredientGroupId(ingredient) {
    return ingredient?.ingredientGroupId || "";
  }

  function isSameIngredientGroup(ingredient, groupId) {
    return Boolean(groupId && ingredient?.ingredientGroupId === groupId);
  }

  function getIngredientGroupMembers(ingredients, ingredient) {
    const groupId = getIngredientGroupId(ingredient);
    if (!groupId) {
      return ingredient ? [ingredient] : [];
    }

    if (!["肉", "魚の切り身"].includes(ingredient?.ingredientGroupLabel)) {
      return ingredient ? [ingredient] : [];
    }

    const group = ingredients.filter((candidate) => candidate.ingredientGroupId === groupId);
    return group.length === 2 ? group : [ingredient];
  }

  function createMovedGridCell(currentCell, targetCell) {
    return {
      ...(currentCell || {}),
      row: targetCell?.row,
      column: targetCell?.column,
    };
  }

  function getGroupOrigin(group) {
    return group.reduce((origin, ingredient) => {
      const row = numberOr(ingredient.gridCell?.row, origin.row);
      const column = numberOr(ingredient.gridCell?.column, origin.column);

      return {
        row: Math.min(origin.row, row),
        column: Math.min(origin.column, column),
      };
    }, { row: Number.POSITIVE_INFINITY, column: Number.POSITIVE_INFINITY });
  }

  function createGroupMoves(group, anchorIngredient, targetCell) {
    const sourceCell = anchorIngredient?.gridCell || {};
    const rowDelta = numberOr(targetCell?.row, sourceCell.row) - numberOr(sourceCell.row, 1);
    const columnDelta = numberOr(targetCell?.column, sourceCell.column) - numberOr(sourceCell.column, 1);

    return group.map((ingredient) => {
      const row = numberOr(ingredient.gridCell?.row, 1) + rowDelta;
      const column = numberOr(ingredient.gridCell?.column, 1) + columnDelta;

      return {
        ingredient,
        gridCell: createMovedGridCell(ingredient.gridCell, { row, column }),
      };
    });
  }

  function createGroupMovesToOrigin(group, targetOrigin) {
    const sourceOrigin = getGroupOrigin(group);

    if (!Number.isFinite(sourceOrigin.row) || !Number.isFinite(sourceOrigin.column)) {
      return [];
    }

    const rowDelta = numberOr(targetOrigin?.row, sourceOrigin.row) - sourceOrigin.row;
    const columnDelta = numberOr(targetOrigin?.column, sourceOrigin.column) - sourceOrigin.column;

    return group.map((ingredient) => {
      const row = numberOr(ingredient.gridCell?.row, 1) + rowDelta;
      const column = numberOr(ingredient.gridCell?.column, 1) + columnDelta;

      return {
        ingredient,
        gridCell: createMovedGridCell(ingredient.gridCell, { row, column }),
      };
    });
  }

  function createSwapGroupMoves(selectedGroup, targetGroup) {
    const selectedOrigin = getGroupOrigin(selectedGroup);
    const targetOrigin = getGroupOrigin(targetGroup);

    return [
      ...createGroupMovesToOrigin(selectedGroup, targetOrigin),
      ...createGroupMovesToOrigin(targetGroup, selectedOrigin),
    ];
  }

  function getDirectionDelta(direction) {
    const directions = {
      up: { row: -1, column: 0 },
      down: { row: 1, column: 0 },
      left: { row: 0, column: -1 },
      right: { row: 0, column: 1 },
    };

    return directions[direction] || null;
  }

  function createRelativeGroupMoves(group, delta) {
    return group.map((ingredient) => ({
      ingredient,
      gridCell: createMovedGridCell(ingredient.gridCell, {
        row: numberOr(ingredient.gridCell?.row, 1) + delta.row,
        column: numberOr(ingredient.gridCell?.column, 1) + delta.column,
      }),
    }));
  }

  function createCellKey(row, column) {
    return `${row}:${column}`;
  }

  function sortCellsForDirection(cells, direction) {
    return [...cells].sort((a, b) => {
      if (direction === "left" || direction === "right") {
        return a.row - b.row || a.column - b.column;
      }

      return a.column - b.column || a.row - b.row;
    });
  }

  function pairTargetCellsWithVacatedCells(targetCells, vacatedCells, direction) {
    const remainingVacatedCells = sortCellsForDirection(vacatedCells, direction);

    return sortCellsForDirection(targetCells, direction).map((targetCell, index) => {
      const pairedCellIndex = remainingVacatedCells.findIndex((vacatedCell) => (
        direction === "left" || direction === "right"
          ? vacatedCell.row === targetCell.row
          : vacatedCell.column === targetCell.column
      ));

      if (pairedCellIndex >= 0) {
        const [pairedCell] = remainingVacatedCells.splice(pairedCellIndex, 1);
        return [targetCell, pairedCell];
      }

      return [targetCell, remainingVacatedCells.splice(index, 1)[0]];
    });
  }

  function findIngredientAtCell(ingredients, row, column) {
    return ingredients.find((ingredient) =>
      numberOr(ingredient.gridCell?.row, 0) === row &&
      numberOr(ingredient.gridCell?.column, 0) === column,
    );
  }

  function createDirectionalSwapMoves(ingredients, selectedGroup, direction) {
    const delta = getDirectionDelta(direction);
    if (!delta || selectedGroup.length === 0) {
      return null;
    }

    const selectedIds = new Set(selectedGroup.map((ingredient) => ingredient.id));
    const selectedCells = selectedGroup.map((ingredient) => ({
      ingredient,
      row: numberOr(ingredient.gridCell?.row, 1),
      column: numberOr(ingredient.gridCell?.column, 1),
    }));
    const selectedCellKeys = new Set(selectedCells.map((cell) => createCellKey(cell.row, cell.column)));
    const destinationCells = selectedCells.map((cell) => ({
      ingredient: cell.ingredient,
      row: cell.row + delta.row,
      column: cell.column + delta.column,
    }));
    const destinationCellKeys = new Set(destinationCells.map((cell) => createCellKey(cell.row, cell.column)));
    const enteringCells = destinationCells.filter((cell) => !selectedCellKeys.has(createCellKey(cell.row, cell.column)));
    const vacatedCells = selectedCells.filter((cell) => !destinationCellKeys.has(createCellKey(cell.row, cell.column)));
    const targetCells = [];
    const targetGroupsById = new Map();

    enteringCells.forEach((cell) => {
      const row = cell.row;
      const column = cell.column;
      const targetIngredient = findIngredientAtCell(ingredients, row, column);

      if (!targetIngredient || selectedIds.has(targetIngredient.id)) {
        return;
      }

      getIngredientGroupMembers(ingredients, targetIngredient).forEach((member) => {
        targetGroupsById.set(member.id, member);
      });
      targetCells.push({ ingredient: targetIngredient, row, column });
    });

    const targetGroup = Array.from(targetGroupsById.values());
    if (targetGroup.length !== targetCells.length) {
      return null;
    }

    const targetByCellKey = new Map(targetCells.map((cell) => [createCellKey(cell.row, cell.column), cell.ingredient]));
    const targetMoves = pairTargetCellsWithVacatedCells(targetCells, vacatedCells, direction)
      .filter(([, vacatedCell]) => vacatedCell)
      .map(([targetCell, vacatedCell]) => ({
        ingredient: targetByCellKey.get(createCellKey(targetCell.row, targetCell.column)),
        gridCell: createMovedGridCell(targetCell.ingredient.gridCell, {
          row: vacatedCell.row,
          column: vacatedCell.column,
        }),
      }));

    return [
      ...createRelativeGroupMoves(selectedGroup, delta),
      ...targetMoves,
    ];
  }

  function getAdjacentDirectionForCell(group, targetCell) {
    const directions = ["up", "down", "left", "right"];

    return directions.find((direction) => {
      const delta = getDirectionDelta(direction);

      return group.some((ingredient) =>
        numberOr(ingredient.gridCell?.row, 1) + delta.row === numberOr(targetCell?.row, 0) &&
        numberOr(ingredient.gridCell?.column, 1) + delta.column === numberOr(targetCell?.column, 0),
      );
    }) || null;
  }

  function canApplyGroupMoves(ingredients, moves, ignoredIds, layout) {
    const rows = Math.max(1, numberOr(layout?.rows, 1));
    const columns = Math.max(1, numberOr(layout?.columns, 1));
    const destinationCells = new Set();
    const occupiedCells = new Set(ingredients
      .filter((ingredient) => !ignoredIds.has(ingredient.id))
      .map((ingredient) => `${ingredient.gridCell?.row}:${ingredient.gridCell?.column}`));

    return moves.every((move) => {
      const row = numberOr(move.gridCell?.row, 0);
      const column = numberOr(move.gridCell?.column, 0);
      const key = `${row}:${column}`;

      if (row < 1 || row > rows || column < 1 || column > columns) {
        return false;
      }

      if (destinationCells.has(key) || occupiedCells.has(key)) {
        return false;
      }

      destinationCells.add(key);
      return true;
    });
  }

  const api = {
    getIngredientGroupId,
    isSameIngredientGroup,
    getIngredientGroupMembers,
    createMovedGridCell,
    getGroupOrigin,
    createGroupMoves,
    createSwapGroupMoves,
    createDirectionalSwapMoves,
    getAdjacentDirectionForCell,
    canApplyGroupMoves,
  };

  global.DQ10BoardLayout = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
