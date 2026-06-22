const defaults = {
  pageSize: "screen",
  difficulty: "medium",
  includeCollectibles: false,
  columns: 20,
  rows: 20,
  cellSizePx: 20,
  strokeWidthPx: 2,
  cellSizeMm: 7,
  strokeWidthMm: 0.5,
  pageMarginMm: 10,
  exportDpi: 300,
  seed: "",
};
const collectibleFrameCount = 10;
const collectibleSpritePath = "collectibles-sprite.png";

const pageSizes = {
  "ipad-97": { kind: "screen", label: "iPad 9.7 / 10.2", widthPx: 1536, heightPx: 2048 },
  "ipad-mini": { kind: "screen", label: "iPad mini 8.3", widthPx: 1488, heightPx: 2266 },
  "ipad-109": { kind: "screen", label: "iPad 10.9 / Air 10.9", widthPx: 1640, heightPx: 2360 },
  "ipad-pro-11": { kind: "screen", label: "iPad Pro 11", widthPx: 1668, heightPx: 2388 },
  "ipad-pro-129": { kind: "screen", label: "iPad Pro 12.9", widthPx: 2048, heightPx: 2732 },
  a5: { kind: "page", label: "A5", widthMm: 148, heightMm: 210, printName: "A5" },
  a4: { kind: "page", label: "A4", widthMm: 210, heightMm: 297, printName: "A4" },
  letter: { kind: "page", label: "Letter", widthMm: 215.9, heightMm: 279.4, printName: "Letter" },
};

function formatTargetDetails(target) {
  if (!target) {
    return "";
  }

  if (target.kind === "screen") {
    return `${target.widthPx} × ${target.heightPx} px`;
  }

  return `${target.widthMm} × ${target.heightMm} mm`;
}

const difficultyProfiles = {
  easy: {
    label: "Easy",
    candidates: 8,
    straightBias: 0.15,
    turnBias: 0.3,
    branchBias: 0.2,
    scoreWeight: 1,
  },
  medium: {
    label: "Medium",
    candidates: 24,
    straightBias: -0.2,
    turnBias: 0.6,
    branchBias: 0.45,
    scoreWeight: 1.45,
  },
  hard: {
    label: "Hard",
    candidates: 48,
    straightBias: -0.45,
    turnBias: 0.95,
    branchBias: 0.7,
    scoreWeight: 1.9,
  },
};

const directions = [
  { key: "north", dx: 0, dy: -1, opposite: "south" },
  { key: "east", dx: 1, dy: 0, opposite: "west" },
  { key: "south", dx: 0, dy: 1, opposite: "north" },
  { key: "west", dx: -1, dy: 0, opposite: "east" },
];

const form = document.querySelector("#controls");
const mazeContainer = document.querySelector("#mazeContainer");
const downloadButton = document.querySelector("#downloadPng");
const toggleSolutionButton = document.querySelector("#toggleSolution");
const printButton = document.querySelector("#printMaze");
const mazeMeta = document.querySelector("#mazeMeta");
const layoutHint = document.querySelector("#layoutHint");
const printStyle = document.querySelector("#printStyle");
const manualControls = document.querySelectorAll(".manual-only");
const screenControls = document.querySelectorAll(".screen-only");
const pageControls = document.querySelectorAll(".page-only");
const pageSizeInput = form.elements.pageSize;
const difficultyInput = form.elements.difficulty;

let currentCanvas = null;
let currentParams = { ...defaults };
let currentDerived = null;
let currentGrid = null;
let currentCollectibles = [];
let currentShowSolution = false;
let collectibleSpriteLayout = null;

const collectibleSprite = new Image();
collectibleSprite.addEventListener("load", () => {
  collectibleSpriteLayout = deriveSpriteLayout(collectibleSprite, collectibleFrameCount);
  refreshMazeDisplay();
});
collectibleSprite.addEventListener("error", () => {
  collectibleSpriteLayout = null;
  refreshMazeDisplay();
});
collectibleSprite.src = collectibleSpritePath;

function createExportSeed(seed) {
  if (seed) {
    return seed;
  }

  return String(Math.floor(Math.random() * 1000000000));
}

function deriveSpriteLayout(image, frameCount) {
  let bestLayout = null;

  for (let columns = 1; columns <= frameCount; columns += 1) {
    if (frameCount % columns !== 0) {
      continue;
    }

    const rows = frameCount / columns;
    const frameWidth = image.width / columns;
    const frameHeight = image.height / rows;
    if (!Number.isInteger(frameWidth) || !Number.isInteger(frameHeight)) {
      continue;
    }

    const squarePenalty = Math.abs(frameWidth - frameHeight);
    if (!bestLayout || squarePenalty < bestLayout.squarePenalty) {
      bestLayout = {
        columns,
        rows,
        frameWidth,
        frameHeight,
        squarePenalty
      };
    }
  }

  return bestLayout;
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed) {
  let state = seed ? hashSeed(seed) : Math.floor(Math.random() * 2 ** 32);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function mmToPixels(mm, dpi) {
  return (mm / 25.4) * dpi;
}

function buildGrid(columns, rows) {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: columns }, (_, x) => ({
      x,
      y,
      visited: false,
      north: true,
      east: true,
      south: true,
      west: true,
    })),
  );
}

function carveCell(current, next, direction) {
  current[direction.key] = false;
  next[direction.opposite] = false;
}

function generateMaze(columns, rows, seed, profile) {
  const grid = buildGrid(columns, rows);
  const random = createRandom(seed);
  const stack = [{ cell: grid[0][0], previousDirection: null }];
  grid[0][0].visited = true;

  while (stack.length > 0) {
    const currentFrame = stack[stack.length - 1];
    const { cell, previousDirection } = currentFrame;
    const options = directions
      .map((direction) => {
        const nextX = cell.x + direction.dx;
        const nextY = cell.y + direction.dy;
        const next = grid[nextY]?.[nextX];
        if (!next || next.visited) {
          return null;
        }

        let weight = 1 + random();
        if (previousDirection && direction.key === previousDirection.key) {
          weight += profile.straightBias;
        }
        if (previousDirection && direction.key !== previousDirection.key) {
          weight += profile.turnBias;
        }

        const distanceToExit =
          Math.abs(columns - 1 - nextX) + Math.abs(rows - 1 - nextY);
        weight += (columns + rows - distanceToExit) / (columns + rows) * profile.branchBias;

        return { direction, next, weight };
      })
      .filter(Boolean)
      .sort((left, right) => right.weight - left.weight);

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const selected = options[0];
    carveCell(cell, selected.next, selected.direction);
    selected.next.visited = true;
    stack.push({
      cell: selected.next,
      previousDirection: selected.direction,
    });
  }

  grid[0][0].west = false;
  grid[rows - 1][columns - 1].east = false;

  return grid;
}

function cellOpenDirections(cell) {
  return directions.filter((direction) => !cell[direction.key]);
}

function solveMaze(grid) {
  const rows = grid.length;
  const columns = grid[0].length;
  const queue = [{ x: 0, y: 0 }];
  const visited = new Set(["0,0"]);
  const previous = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === columns - 1 && current.y === rows - 1) {
      const path = [];
      let key = `${current.x},${current.y}`;

      while (key) {
        const [x, y] = key.split(",").map(Number);
        path.push({ x, y });
        key = previous.get(key);
      }

      return path.reverse();
    }

    const cell = grid[current.y][current.x];
    for (const direction of directions) {
      if (cell[direction.key]) {
        continue;
      }

      const nextX = current.x + direction.dx;
      const nextY = current.y + direction.dy;
      const nextCell = grid[nextY]?.[nextX];
      if (!nextCell) {
        continue;
      }

      const nextKey = `${nextX},${nextY}`;
      if (visited.has(nextKey)) {
        continue;
      }

      visited.add(nextKey);
      previous.set(nextKey, `${current.x},${current.y}`);
      queue.push({ x: nextX, y: nextY });
    }
  }

  return [];
}

function createCollectibleSeed(seed, grid) {
  const mazeSignature = grid
    .flat()
    .map((cell) =>
      `${Number(cell.north)}${Number(cell.east)}${Number(cell.south)}${Number(cell.west)}`
    )
    .join("");
  return hashSeed(`${seed}::collectibles::${mazeSignature}`);
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

function keyToPoint(key) {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

function buildMazeTree(grid) {
  const queue = [{ x: 0, y: 0 }];
  const parentMap = new Map([["0,0", null]]);
  const childrenMap = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = pointKey(current);
    const cell = grid[current.y][current.x];

    for (const direction of directions) {
      if (cell[direction.key]) {
        continue;
      }

      const nextX = current.x + direction.dx;
      const nextY = current.y + direction.dy;
      const nextCell = grid[nextY]?.[nextX];
      if (!nextCell) {
        continue;
      }

      const nextKey = `${nextX},${nextY}`;
      if (parentMap.has(nextKey)) {
        continue;
      }

      parentMap.set(nextKey, currentKey);
      if (!childrenMap.has(currentKey)) {
        childrenMap.set(currentKey, []);
      }
      childrenMap.get(currentKey).push(nextKey);
      queue.push({ x: nextX, y: nextY });
    }
  }

  return { parentMap, childrenMap };
}

function treeDistance(parentMap, firstKey, secondKey) {
  const visited = new Map();
  let key = firstKey;
  let distance = 0;

  while (key) {
    visited.set(key, distance);
    key = parentMap.get(key);
    distance += 1;
  }

  key = secondKey;
  distance = 0;

  while (key) {
    if (visited.has(key)) {
      return visited.get(key) + distance;
    }
    key = parentMap.get(key);
    distance += 1;
  }

  return Number.MAX_SAFE_INTEGER;
}

function chooseCollectibleCells(grid, seed) {
  const rows = grid.length;
  const columns = grid[0].length;
  const { parentMap, childrenMap } = buildMazeTree(grid);
  const candidates = [];

  for (const row of grid) {
    for (const cell of row) {
      const isStart = cell.x === 0 && cell.y === 0;
      const isExit = cell.x === columns - 1 && cell.y === rows - 1;
      if (!isStart && !isExit) {
        const key = `${cell.x},${cell.y}`;
        let depth = 0;
        let parentKey = parentMap.get(key);

        while (parentKey) {
          depth += 1;
          parentKey = parentMap.get(parentKey);
        }

        candidates.push({
          x: cell.x,
          y: cell.y,
          key,
          depth,
          degree: cellOpenDirections(cell).length,
          branchCount: (childrenMap.get(key) || []).length
        });
      }
    }
  }

  const itemCount = Math.min(collectibleFrameCount, candidates.length);
  const random = createRandom(createCollectibleSeed(seed, grid));
  const chosen = [];

  while (chosen.length < itemCount && candidates.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const exitDistance = treeDistance(parentMap, candidate.key, `${columns - 1},${rows - 1}`);
      const spacingScore = chosen.length === 0
        ? candidate.depth + exitDistance
        : Math.min(
          ...chosen.map((placed) => treeDistance(parentMap, placed.key, candidate.key))
        );
      const score =
        spacingScore * 12 +
        candidate.depth * 4 +
        exitDistance * 2 +
        candidate.branchCount * 10 +
        candidate.degree * 3 +
        random() * 25;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    const [nextCell] = candidates.splice(bestIndex, 1);
    chosen.push(nextCell);
  }

  return chosen.map((cell, index) => ({
    ...cell,
    frame: index % collectibleFrameCount
  }));
}

function createCollectibleSignature(collectibles) {
  return collectibles
    .map((collectible) => `${collectible.x}.${collectible.y}.${collectible.frame}`)
    .join("-");
}

function formatConfigSeed(params, derived, collectibles) {
  const cellSize = derived.mode === "page"
    ? `${params.cellSizeMm}mm`
    : `${params.cellSizePx}px`;
  const stroke = derived.mode === "page"
    ? `${params.strokeWidthMm}mm`
    : `${params.strokeWidthPx}px`;
  const collectibleState = params.includeCollectibles ? "on" : "off";
  const collectibleSignature = collectibles.length
    ? createCollectibleSignature(collectibles)
    : "none";

  return [
    `baseSeed=${params.baseSeed ?? params.seed}`,
    `pageSize=${params.pageSize}`,
    `difficulty=${params.difficulty}`,
    `collectibles=${collectibleState}`,
    `collectibleLayout=${collectibleSignature}`,
    `cellSize=${cellSize}`,
    `stroke=${stroke}`,
    `columns=${derived.columns}`,
    `rows=${derived.rows}`
  ].join("|");
}

function buildConfigPayload(params, derived) {
  const payload = {
    pageSize: params.pageSize,
    difficulty: params.difficulty,
    includeCollectibles: params.includeCollectibles ? "1" : "0",
  };

  if (params.userProvidedSeed) {
    payload.seed = params.baseSeed;
  }

  if (params.pageSize === "screen" || pageSizes[params.pageSize]?.kind === "screen") {
    payload.cellSizePx = String(params.cellSizePx);
    payload.strokeWidthPx = String(params.strokeWidthPx);
  }

  if (pageSizes[params.pageSize]?.kind === "page") {
    payload.cellSizeMm = String(params.cellSizeMm);
    payload.strokeWidthMm = String(params.strokeWidthMm);
  }

  if (params.pageSize === "screen") {
    payload.columns = String(params.columns);
    payload.rows = String(params.rows);
  }

  return payload;
}

function buildConfigUrl(params, derived) {
  const url = new URL(window.location.href);
  url.search = "";

  for (const [key, value] of Object.entries(buildConfigPayload(params, derived))) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function applyConfigFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.toString()) {
    return false;
  }

  const textFields = [
    "pageSize",
    "difficulty",
    "seed"
  ];
  const numericFields = [
    "columns",
    "rows",
    "cellSizePx",
    "strokeWidthPx",
    "cellSizeMm",
    "strokeWidthMm",
    "pageMarginMm",
    "exportDpi"
  ];

  for (const name of textFields) {
    const value = searchParams.get(name);
    if (value !== null && form.elements[name]) {
      form.elements[name].value = value;
    }
  }

  const includeCollectibles = searchParams.get("includeCollectibles");
  if (includeCollectibles !== null && form.elements.includeCollectibles) {
    form.elements.includeCollectibles.checked = includeCollectibles === "1" || includeCollectibles === "true";
  }

  for (const name of numericFields) {
    const value = searchParams.get(name);
    if (value === null || !form.elements[name]) {
      continue;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      form.elements[name].value = parsed;
    }
  }

  return true;
}

function wrapConfigText(context, text, maxWidth) {
  const parts = text.split("|");
  const lines = [];
  let currentLine = "";

  for (const part of parts) {
    const candidate = currentLine ? `${currentLine}|${part}` : part;
    if (!currentLine || context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = part;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function decorateMazeCanvas(mazeCanvas, params, derived) {
  if (!params?.baseSeed || !derived?.footerHeight || params.hideFooter) {
    return mazeCanvas;
  }

  const context = mazeCanvas.getContext("2d");
  const footerH = derived.footerHeight;
  const fontSize = Math.max(9, Math.round(footerH * 0.28));
  const pad = Math.round(footerH * 0.35);
  const baselineY = mazeCanvas.height - pad;

  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.3)";
  context.textBaseline = "bottom";

  context.font = `${fontSize}px "Georgia", "Times New Roman", serif`;
  context.textAlign = "left";
  context.fillText("pen-and-paper maze studio", pad, baselineY);

  context.font = `${fontSize}px ui-monospace, "Courier New", monospace`;
  context.textAlign = "right";
  context.fillText(`seed: ${params.baseSeed}`, mazeCanvas.width - pad, baselineY);

  context.restore();
  return mazeCanvas;
}

function buildSolutionPath(grid, collectibles = []) {
  if (!collectibles.length) {
    return solveMaze(grid);
  }

  const rows = grid.length;
  const columns = grid[0].length;
  const exitKey = `${columns - 1},${rows - 1}`;
  const requiredKeys = new Set([exitKey, ...collectibles.map(pointKey)]);
  const { parentMap, childrenMap } = buildMazeTree(grid);
  const subtreeKeys = new Set(["0,0"]);
  const exitPathKeys = new Set();

  let currentKey = exitKey;
  while (currentKey) {
    exitPathKeys.add(currentKey);
    currentKey = parentMap.get(currentKey);
  }

  for (const key of requiredKeys) {
    let branchKey = key;
    while (branchKey) {
      subtreeKeys.add(branchKey);
      branchKey = parentMap.get(branchKey);
    }
  }

  function walk(current) {
    const route = [keyToPoint(current)];
    const childKeys = (childrenMap.get(current) || []).filter((childKey) => subtreeKeys.has(childKey));
    const exitChild = childKeys.find((childKey) => exitPathKeys.has(childKey)) ?? null;

    for (const childKey of childKeys) {
      if (childKey === exitChild) {
        continue;
      }

      const branchRoute = walk(childKey);
      route.push(...branchRoute);
      route.push(keyToPoint(current));
    }

    if (exitChild) {
      const exitRoute = walk(exitChild);
      route.push(...exitRoute);
    }

    return route;
  }

  return walk("0,0");
}

function countSolutionBranches(grid, solutionSet) {
  let branches = 0;

  for (const key of solutionSet) {
    const [x, y] = key.split(",").map(Number);
    const cell = grid[y][x];

    for (const direction of directions) {
      if (cell[direction.key]) {
        continue;
      }

      const nextKey = `${x + direction.dx},${y + direction.dy}`;
      if (!solutionSet.has(nextKey)) {
        branches += 1;
      }
    }
  }

  return branches;
}

function countDeadEnds(grid, solutionSet) {
  let deadEnds = 0;

  for (const row of grid) {
    for (const cell of row) {
      const key = `${cell.x},${cell.y}`;
      if (solutionSet.has(key)) {
        continue;
      }

      if (cellOpenDirections(cell).length === 1) {
        deadEnds += 1;
      }
    }
  }

  return deadEnds;
}

function computeCorridorPenalty(grid, solution) {
  let penalty = 0;
  let runLength = 1;
  let previousDirection = null;

  for (let index = 1; index < solution.length; index += 1) {
    const previous = solution[index - 1];
    const current = solution[index];
    const directionKey =
      current.x > previous.x
        ? "east"
        : current.x < previous.x
          ? "west"
          : current.y > previous.y
            ? "south"
            : "north";

    if (directionKey === previousDirection) {
      runLength += 1;
    } else {
      if (runLength > 2) {
        penalty += runLength - 2;
      }
      runLength = 1;
      previousDirection = directionKey;
    }

    const cell = grid[current.y][current.x];
    if (cellOpenDirections(cell).length > 2) {
      penalty += 0.2;
    }
  }

  if (runLength > 2) {
    penalty += runLength - 2;
  }

  return penalty;
}

function scoreMazeDifficulty(grid, profile, collectibles = []) {
  const solution = buildSolutionPath(grid, collectibles);
  const solutionSet = new Set(solution.map((cell) => `${cell.x},${cell.y}`));
  const solutionBranches = countSolutionBranches(grid, solutionSet);
  const deadEnds = countDeadEnds(grid, solutionSet);
  const corridorPenalty = computeCorridorPenalty(grid, solution);

  return (
    solution.length * 4 +
    solutionBranches * 6 +
    deadEnds * 2 -
    corridorPenalty * 5
  ) * profile.scoreWeight;
}

function selectMaze(columns, rows, params) {
  const profile = difficultyProfiles[params.difficulty];
  let bestGrid = null;
  let bestScore = -Infinity;

  for (let index = 0; index < profile.candidates; index += 1) {
    const candidateSeed = params.seed
      ? `${params.seed}::${params.difficulty}::${index}`
      : `${params.difficulty}::${index}::${Math.random()}`;
    const candidateGrid = generateMaze(columns, rows, candidateSeed, profile);
    const candidateCollectibles = params.includeCollectibles
      ? chooseCollectibleCells(candidateGrid, params.seed || candidateSeed)
      : [];
    const candidateScore = scoreMazeDifficulty(candidateGrid, profile, candidateCollectibles);

    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      bestGrid = candidateGrid;
    }
  }

  return bestGrid;
}

function syncLayoutControls() {
  const selectedSize = pageSizes[pageSizeInput.value] || null;
  const isManualScreen = pageSizeInput.value === "screen";
  const isPageMode = selectedSize?.kind === "page";
  const isPresetScreenMode = selectedSize?.kind === "screen";

  for (const group of manualControls) {
    group.classList.toggle("is-hidden", !isManualScreen);
  }

  for (const group of screenControls) {
    group.classList.toggle("is-hidden", isPageMode);
  }

  for (const group of pageControls) {
    group.classList.toggle("is-hidden", !isPageMode);
  }

  layoutHint.textContent = isPageMode
    ? "Print targets fit the maze automatically to the chosen paper size."
    : isPresetScreenMode
      ? "Device presets fit the maze automatically to the chosen screen size."
      : "Custom screen mode uses your row and column values directly.";
}

function readParams() {
  const formData = new FormData(form);

  return {
    pageSize: String(formData.get("pageSize") || defaults.pageSize),
    difficulty: String(formData.get("difficulty") || defaults.difficulty),
    columns: clamp(Number(formData.get("columns")) || defaults.columns, 5, 80),
    rows: clamp(Number(formData.get("rows")) || defaults.rows, 5, 80),
    cellSizePx: clamp(Number(formData.get("cellSizePx")) || defaults.cellSizePx, 8, 80),
    strokeWidthPx: clamp(Number(formData.get("strokeWidthPx")) || defaults.strokeWidthPx, 1, 8),
    cellSizeMm: clamp(Number(formData.get("cellSizeMm")) || defaults.cellSizeMm, 3, 20),
    strokeWidthMm: clamp(Number(formData.get("strokeWidthMm")) || defaults.strokeWidthMm, 0.2, 2),
    pageMarginMm: defaults.pageMarginMm,
    exportDpi: defaults.exportDpi,
    seed: String(formData.get("seed") || "").trim(),
    hideFooter: formData.get("hideFooter") === "on",
  };
}

function deriveLayout(params) {
  if (params.pageSize === "screen") {
    const footerHeight = params.hideFooter ? 0 : Math.round(Math.max(params.cellSizePx * 2.8, 44));
    const canvasWidth = Math.round(params.columns * params.cellSizePx + params.strokeWidthPx);
    const canvasHeight = Math.round(params.rows * params.cellSizePx + params.strokeWidthPx + footerHeight);

    return {
      mode: "screen",
      label: "Custom screen",
      targetKind: "screen",
      targetDetails: "Custom grid",
      columns: params.columns,
      rows: params.rows,
      cellSize: params.cellSizePx,
      strokeWidth: params.strokeWidthPx,
      canvasWidth,
      canvasHeight,
      drawOffsetX: params.strokeWidthPx / 2,
      drawOffsetY: params.strokeWidthPx / 2,
      footerHeight,
      previewStyle: `width: min(100%, ${canvasWidth}px);`,
      sheetStyle: "",
      fileSuffix: "screen",
    };
  }

  const page = pageSizes[params.pageSize];

  if (page.kind === "screen") {
    const columns = Math.max(5, Math.floor((page.widthPx - params.strokeWidthPx) / params.cellSizePx));
    const rows = Math.max(5, Math.floor((page.heightPx - params.strokeWidthPx) / params.cellSizePx));
    const mazeWidthPx = columns * params.cellSizePx + params.strokeWidthPx;
    const mazeHeightPx = rows * params.cellSizePx + params.strokeWidthPx;
    const drawOffsetX = (page.widthPx - mazeWidthPx) / 2 + params.strokeWidthPx / 2;
    const drawOffsetY = (page.heightPx - mazeHeightPx) / 2 + params.strokeWidthPx / 2;
    const footerHeight = params.hideFooter ? 0 : Math.round(Math.max(params.cellSizePx * 2.8, 44));

    return {
      mode: "screen",
      label: page.label,
      targetKind: "screen",
      targetDetails: formatTargetDetails(page),
      columns,
      rows,
      cellSize: params.cellSizePx,
      strokeWidth: params.strokeWidthPx,
      canvasWidth: page.widthPx,
      canvasHeight: page.heightPx + footerHeight,
      drawOffsetX,
      drawOffsetY,
      footerHeight,
      previewStyle: `width: min(100%, ${page.widthPx}px);`,
      sheetStyle: "",
      fileSuffix: params.pageSize,
    };
  }

  const availableWidthMm = Math.max(page.widthMm - params.pageMarginMm * 2, params.cellSizeMm * 5 + params.strokeWidthMm);
  const availableHeightMm = Math.max(page.heightMm - params.pageMarginMm * 2, params.cellSizeMm * 5 + params.strokeWidthMm);
  const columns = Math.max(5, Math.floor((availableWidthMm - params.strokeWidthMm) / params.cellSizeMm));
  const rows = Math.max(5, Math.floor((availableHeightMm - params.strokeWidthMm) / params.cellSizeMm));
  const mazeWidthMm = columns * params.cellSizeMm + params.strokeWidthMm;
  const mazeHeightMm = rows * params.cellSizeMm + params.strokeWidthMm;
  const mazeWidthPx = mmToPixels(mazeWidthMm, params.exportDpi);
  const mazeHeightPx = mmToPixels(mazeHeightMm, params.exportDpi);
  const pageWidthPx = Math.round(mmToPixels(page.widthMm, params.exportDpi));
  const pageHeightPx = Math.round(mmToPixels(page.heightMm, params.exportDpi));
  const strokeWidth = Math.max(mmToPixels(params.strokeWidthMm, params.exportDpi), 1);
  const drawOffsetX = (pageWidthPx - mazeWidthPx) / 2 + strokeWidth / 2;
  const drawOffsetY = (pageHeightPx - mazeHeightPx) / 2 + strokeWidth / 2;

  return {
    mode: "page",
    label: page.label,
    targetKind: "print",
    targetDetails: formatTargetDetails(page),
    columns,
    rows,
    cellSize: mmToPixels(params.cellSizeMm, params.exportDpi),
    strokeWidth,
    canvasWidth: pageWidthPx,
    canvasHeight: pageHeightPx,
    drawOffsetX,
    drawOffsetY,
    footerHeight: drawOffsetY,
    previewStyle: `width: min(100%, ${page.widthMm}mm); aspect-ratio: ${page.widthMm} / ${page.heightMm};`,
    sheetStyle: `width: min(100%, ${page.widthMm}mm); aspect-ratio: ${page.widthMm} / ${page.heightMm};`,
    printName: page.printName,
    fileSuffix: params.pageSize,
  };
}

function drawCollectibles(context, derived, collectibles) {
  if (!collectibles.length) {
    return;
  }

  const inset = derived.cellSize * 0.18;
  const size = derived.cellSize - inset * 2;

  for (const collectible of collectibles) {
    const x = derived.drawOffsetX + collectible.x * derived.cellSize + inset;
    const y = derived.drawOffsetY + collectible.y * derived.cellSize + inset;

    if (collectibleSpriteLayout) {
      const frameColumn = collectible.frame % collectibleSpriteLayout.columns;
      const frameRow = Math.floor(collectible.frame / collectibleSpriteLayout.columns);
      context.drawImage(
        collectibleSprite,
        frameColumn * collectibleSpriteLayout.frameWidth,
        frameRow * collectibleSpriteLayout.frameHeight,
        collectibleSpriteLayout.frameWidth,
        collectibleSpriteLayout.frameHeight,
        x,
        y,
        size,
        size
      );
      continue;
    }

    context.save();
    context.fillStyle = "#d88c2f";
    context.strokeStyle = "#1c1813";
    context.lineWidth = Math.max(1, derived.strokeWidth * 0.6);
    context.beginPath();
    context.arc(
      x + size / 2,
      y + size / 2,
      size / 2,
      0,
      Math.PI * 2
    );
    context.fill();
    context.stroke();
    context.fillStyle = "#1c1813";
    context.font = `${Math.max(10, Math.round(size * 0.42))}px Georgia, serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(collectible.frame + 1), x + size / 2, y + size / 2);
    context.restore();
  }
}

function renderMazeCanvas(grid, derived, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(derived.canvasWidth);
  canvas.height = Math.round(derived.canvasHeight);

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#1c1813";
  context.lineWidth = derived.strokeWidth;
  context.lineCap = "square";
  context.beginPath();

  for (const row of grid) {
    for (const cell of row) {
      const x = derived.drawOffsetX + cell.x * derived.cellSize;
      const y = derived.drawOffsetY + cell.y * derived.cellSize;

      if (cell.north) {
        context.moveTo(x, y);
        context.lineTo(x + derived.cellSize, y);
      }

      if (cell.west) {
        context.moveTo(x, y);
        context.lineTo(x, y + derived.cellSize);
      }

      if (cell.south) {
        context.moveTo(x, y + derived.cellSize);
        context.lineTo(x + derived.cellSize, y + derived.cellSize);
      }

      if (cell.east) {
        context.moveTo(x + derived.cellSize, y);
        context.lineTo(x + derived.cellSize, y + derived.cellSize);
      }
    }
  }

  context.stroke();
  drawCollectibles(context, derived, options.collectibles || []);

  if (options.showSolution) {
    const solution = buildSolutionPath(grid, options.collectibles || []);

    if (solution.length > 1) {
      context.save();
      context.beginPath();
      context.strokeStyle = "#b42318";
      context.lineWidth = Math.max(derived.strokeWidth * 0.8, 3);
      context.lineCap = "round";
      context.lineJoin = "round";

      for (const [index, cell] of solution.entries()) {
        const x = derived.drawOffsetX + (cell.x + 0.5) * derived.cellSize;
        const y = derived.drawOffsetY + (cell.y + 0.5) * derived.cellSize;

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
      context.restore();
    }
  }

  return canvas;
}

function refreshMazeDisplay() {
  if (!currentGrid || !currentDerived) {
    return;
  }

  const mazeCanvas = renderMazeCanvas(currentGrid, currentDerived, {
    showSolution: currentShowSolution,
    collectibles: currentCollectibles
  });
  const canvas = decorateMazeCanvas(mazeCanvas, currentParams, currentDerived);
  const sheet = buildMazeSheet(canvas, currentDerived);

  mazeContainer.innerHTML = "";
  mazeContainer.append(sheet);
  currentCanvas = canvas;
  toggleSolutionButton.textContent = currentShowSolution ? "Hide solution" : "Show solution";
}

function renderExportCanvas(showSolution = currentShowSolution) {
  if (!currentCanvas || !currentDerived || !currentGrid) {
    return null;
  }

  const mazeCanvas = showSolution
    ? renderMazeCanvas(currentGrid, currentDerived, {
      showSolution: true,
      collectibles: currentCollectibles
    })
    : renderMazeCanvas(currentGrid, currentDerived, {
      showSolution: false,
      collectibles: currentCollectibles
    });

  return decorateMazeCanvas(mazeCanvas, currentParams, currentDerived);
}

function buildMazeSheet(canvas, derived) {
  const sheet = document.createElement("div");
  sheet.className = `maze-sheet ${derived.mode === "page" ? "page-sheet" : ""}`;

  if (derived.sheetStyle) {
    sheet.style.cssText = derived.sheetStyle;
  }

  if (derived.mode === "screen") {
    canvas.style.cssText = derived.previewStyle;
  } else {
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }

  sheet.append(canvas);
  return sheet;
}

function updateMeta(params, derived) {
  mazeMeta.innerHTML = `
    <div>
      <dt>Target</dt>
      <dd>${derived.label}</dd>
    </div>
    <div>
      <dt>Fit</dt>
      <dd>${derived.columns} x ${derived.rows}</dd>
    </div>
    <div>
      <dt>Canvas</dt>
      <dd>${derived.targetDetails}</dd>
    </div>
    <div>
      <dt>Difficulty</dt>
      <dd>${difficultyProfiles[params.difficulty].label}</dd>
    </div>
  `;
}

function updatePrintStyle(derived) {
  if (derived.mode === "page") {
    printStyle.textContent = `@media print { @page { size: ${derived.printName} portrait; margin: 0; } }`;
    return;
  }

  printStyle.textContent = "";
}

function render(params) {
  const derived = deriveLayout(params);
  const includeCollectibles = Boolean(form.elements.includeCollectibles?.checked);
  const baseSeed = createExportSeed(params.seed);
  const effectiveParams = {
    ...params,
    includeCollectibles,
    seed: baseSeed
  };
  const grid = selectMaze(derived.columns, derived.rows, effectiveParams);
  const collectibles = effectiveParams.includeCollectibles
    ? chooseCollectibleCells(grid, baseSeed)
    : [];
  currentParams = effectiveParams;
  currentParams.baseSeed = baseSeed;
  currentParams.userProvidedSeed = Boolean(params.seed);
  window.history.replaceState(null, "", buildConfigUrl(currentParams, derived));
  currentParams.seed = formatConfigSeed(currentParams, derived, collectibles);
  currentDerived = derived;
  currentGrid = grid;
  currentCollectibles = collectibles;
  currentShowSolution = false;

  refreshMazeDisplay();

  updateMeta(effectiveParams, derived);
  updatePrintStyle(derived);
}

function downloadPng() {
  if (!currentCanvas || !currentDerived || !currentGrid) {
    return;
  }

  const exportCanvas = renderExportCanvas();

  if (!exportCanvas) {
    return;
  }

  exportCanvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    const solutionLabel = currentShowSolution ? "-solution" : "";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `maze-${currentDerived.columns}x${currentDerived.rows}-${currentParams.difficulty}-${currentDerived.fileSuffix}${solutionLabel}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

pageSizeInput.addEventListener("change", () => {
  syncLayoutControls();
  render(readParams());
});

difficultyInput.addEventListener("change", () => {
  render(readParams());
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  render(readParams());
});

downloadButton.addEventListener("click", downloadPng);
toggleSolutionButton.addEventListener("click", () => {
  if (!currentGrid) {
    return;
  }

  currentShowSolution = !currentShowSolution;
  refreshMazeDisplay();
});
printButton.addEventListener("click", () => window.print());
form.elements.hideFooter.addEventListener("change", () => {
  if (currentGrid) {
    currentParams.hideFooter = form.elements.hideFooter.checked;
    currentDerived = deriveLayout(currentParams);
    refreshMazeDisplay();
  }
});

const didApplyConfigFromUrl = applyConfigFromUrl();
syncLayoutControls();
render(didApplyConfigFromUrl ? readParams() : defaults);
