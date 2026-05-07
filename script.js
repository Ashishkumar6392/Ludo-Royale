"use strict";

const PLAYERS = [
  { id: "red", name: "Red", start: 0, entry: 50, color: "#ef4444", ai: false },
  { id: "green", name: "Green", start: 13, entry: 11, color: "#16a34a", ai: true },
  { id: "yellow", name: "Yellow", start: 26, entry: 24, color: "#f59e0b", ai: true },
  { id: "blue", name: "Blue", start: 39, entry: 37, color: "#2563eb", ai: true }
];

const TRACK = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
];

const HOME_LANES = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]]
};

const YARDS = {
  red: { area: [0, 0, 6, 6], slots: [[1, 1], [1, 4], [4, 1], [4, 4]] },
  green: { area: [0, 9, 6, 15], slots: [[1, 10], [1, 13], [4, 10], [4, 13]] },
  yellow: { area: [9, 9, 15, 15], slots: [[10, 10], [10, 13], [13, 10], [13, 13]] },
  blue: { area: [9, 0, 15, 6], slots: [[10, 1], [10, 4], [13, 1], [13, 4]] }
};

const SAFE_TRACKS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const FINISH_CELLS = {
  red: [[6, 6]],
  green: [[6, 8]],
  yellow: [[8, 8]],
  blue: [[8, 6]]
};

const SNAKE_JUMPS = {
  4: 25,
  13: 46,
  33: 49,
  42: 63,
  50: 69,
  62: 81,
  74: 92,
  27: 5,
  40: 3,
  43: 18,
  54: 31,
  66: 45,
  76: 58,
  89: 53,
  99: 41
};

const boardEl = document.getElementById("board");
const scoreboardEl = document.getElementById("scoreboard");
const diceBtn = document.getElementById("diceBtn");
const diceFace = document.getElementById("diceFace");
const turnLabel = document.getElementById("turnLabel");
const rollHint = document.getElementById("rollHint");
const messageEl = document.getElementById("message");
const statusEl = document.getElementById("gameStatus");
const toastEl = document.getElementById("toast");
const modeSelect = document.getElementById("modeSelect");
const playerCountSelect = document.getElementById("playerCount");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const gameTitle = document.getElementById("gameTitle");
const gameTabs = document.querySelectorAll(".game-tab");

let cells = new Map();
let yardSlots = new Map();
let snakeCells = new Map();
let snakePieces = [];
let currentGame = "ludo";
let players = [];
let tokens = [];
let currentPlayerIndex = 0;
let lastRoll = null;
let canRoll = false;
let awaitingMove = false;
let gameOver = false;
let audioCtx = null;
let boardTurnBadge = null;
let boardDiceButtons = new Map();

function key(row, col) {
  return `${row}-${col}`;
}

function makeDiv(className, parent) {
  const div = document.createElement("div");
  div.className = className;
  parent.appendChild(div);
  return div;
}

function initBoard() {
  boardEl.innerHTML = "";
  boardEl.className = "board";
  cells = new Map();
  yardSlots = new Map();
  boardDiceButtons = new Map();

  Object.entries(YARDS).forEach(([color, yard]) => {
    const [r1, c1, r2, c2] = yard.area;
    const el = makeDiv(`yard ${color}`, boardEl);
    el.style.gridRow = `${r1 + 1} / ${r2 + 1}`;
    el.style.gridColumn = `${c1 + 1} / ${c2 + 1}`;

    yard.slots.forEach((slot, index) => {
      const slotEl = makeDiv("yard-slot", el);
      yardSlots.set(`${color}-${index}`, slotEl);
    });
  });

  for (let row = 0; row < 15; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      if (isInsideYard(row, col) || (row >= 6 && row <= 8 && col >= 6 && col <= 8)) continue;

      const cell = makeDiv("cell", boardEl);
      cell.style.gridRow = row + 1;
      cell.style.gridColumn = col + 1;
      cells.set(key(row, col), cell);
    }
  }

  TRACK.forEach(([row, col], index) => {
    const cell = cells.get(key(row, col));
    if (!cell) return;
    cell.classList.add("path");
    if (SAFE_TRACKS.has(index)) cell.classList.add("safe");
    const starter = PLAYERS.find((player) => player.start === index);
    if (starter) cell.classList.add("start", starter.id);
  });

  Object.entries(HOME_LANES).forEach(([color, lane]) => {
    lane.forEach(([row, col]) => {
      const cell = cells.get(key(row, col));
      if (cell) cell.classList.add("home-lane", color);
    });
  });

  Object.entries(FINISH_CELLS).forEach(([color, triangles]) => {
    triangles.forEach(([row, col]) => {
      const cell = makeDiv(`finish ${color}`, boardEl);
      cell.style.gridRow = row + 1;
      cell.style.gridColumn = col + 1;
    });
  });

  Object.entries({
    red: [7, 6],
    green: [6, 7],
    yellow: [7, 8],
    blue: [8, 7]
  }).forEach(([color, [row, col]]) => {
    const cell = makeDiv(`cell path home-lane ${color} safe`, boardEl);
    cell.style.gridRow = row + 1;
    cell.style.gridColumn = col + 1;
    cells.set(key(row, col), cell);
  });

  const logo = makeDiv("center-logo", boardEl);
  logo.textContent = "LUDO";

  boardTurnBadge = makeDiv("board-turn-badge", boardEl);
  boardTurnBadge.textContent = "Start game";

  PLAYERS.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `board-dice ${player.id} hidden`;
    button.dataset.playerId = player.id;
    renderDiceFace(button, "?");
    button.setAttribute("aria-label", `${player.name} dice`);
    button.addEventListener("click", () => rollDice(player.id));
    boardEl.appendChild(button);
    boardDiceButtons.set(player.id, button);
  });
}

function isInsideYard(row, col) {
  return Object.values(YARDS).some((yard) => {
    const [r1, c1, r2, c2] = yard.area;
    return row >= r1 && row < r2 && col >= c1 && col < c2;
  });
}

function createGame() {
  if (currentGame === "snake") {
    createSnakeGame();
    return;
  }
  initBoard();
  createLudoGame();
}

function getSelectedPlayers() {
  const count = Number(playerCountSelect.value);
  const mode = modeSelect.value;
  const playerOrder = count === 2
    ? ["red", "yellow"]
    : count === 3
      ? ["red", "green", "yellow"]
      : ["red", "green", "yellow", "blue"];

  return playerOrder.map((playerId, index) => {
    const player = PLAYERS.find((item) => item.id === playerId);
    return {
      ...player,
      ai: mode === "ai" && index > 0,
      active: true,
      rank: null
    };
  });
}

function createLudoGame() {
  players = getSelectedPlayers();

  tokens = players.flatMap((player) => Array.from({ length: 4 }, (_, index) => ({
    id: `${player.id}-${index}`,
    playerId: player.id,
    index,
    steps: -1,
    finished: false
  })));

  currentPlayerIndex = 0;
  lastRoll = null;
  canRoll = true;
  awaitingMove = false;
  gameOver = false;
  gameTitle.textContent = "Ludo Royale";
  syncDiceFaces("?");
  messageEl.textContent = "Roll the dice to begin.";
  statusEl.textContent = `${players.length} players ready`;
  renderAll();
  updateTurnUi();
  maybeAiTurn();
}

function createSnakeGame() {
  boardEl.innerHTML = "";
  boardEl.className = "snake-board";
  cells = new Map();
  yardSlots = new Map();
  boardDiceButtons = new Map();
  snakeCells = new Map();
  boardTurnBadge = null;
  players = getSelectedPlayers();
  snakePieces = players.map((player) => ({
    playerId: player.id,
    position: 1,
    finished: false
  }));

  buildSnakeBoard();
  currentPlayerIndex = 0;
  lastRoll = null;
  canRoll = true;
  awaitingMove = false;
  gameOver = false;
  gameTitle.textContent = "Snakes and Ladders";
  syncDiceFaces("?");
  messageEl.textContent = "Dice roll karo aur 100 tak pahucho.";
  statusEl.textContent = `${players.length} players ready`;
  renderSnakeAll();
  updateTurnUi();
  maybeAiTurn();
}

function buildSnakeBoard() {
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      const number = snakeNumberForCell(row, col);
      const cell = makeDiv("snake-cell", boardEl);
      cell.style.gridRow = row + 1;
      cell.style.gridColumn = col + 1;
      cell.textContent = number;
      if (SNAKE_JUMPS[number]) {
        const marker = document.createElement("span");
        marker.className = "snake-marker";
        marker.textContent = SNAKE_JUMPS[number] > number ? "L" : "S";
        cell.classList.add(SNAKE_JUMPS[number] > number ? "jump-up" : "jump-down");
        cell.appendChild(marker);
      }
      snakeCells.set(number, cell);
    }
  }
}

function snakeNumberForCell(row, col) {
  const base = (9 - row) * 10;
  return row % 2 === 0 ? base + (10 - col) : base + col + 1;
}

function renderSnakeAll() {
  document.querySelectorAll(".snake-piece").forEach((piece) => piece.remove());
  snakePieces.forEach((piece, index) => {
    const cell = snakeCells.get(piece.position);
    if (!cell) return;
    const el = document.createElement("span");
    el.className = `snake-piece ${piece.playerId} slot-${index}`;
    cell.appendChild(el);
  });
  renderScoreboard();
}

function afterSnakeRoll() {
  const piece = snakePieces.find((item) => item.playerId === currentPlayer().id);
  const target = piece.position + lastRoll;
  statusEl.textContent = `${currentPlayer().name} ne ${lastRoll} roll kiya`;
  if (target > 100) {
    messageEl.textContent = `${currentPlayer().name} ko exact ${100 - piece.position} chahiye.`;
    playTone(120, 0.12, "sawtooth");
    window.setTimeout(nextTurn, 850);
    return;
  }

  piece.position = target;
  playTone(420, 0.08, "sine");
  renderSnakeAll();

  const jump = SNAKE_JUMPS[piece.position];
  if (jump) {
    window.setTimeout(() => {
      const wentUp = jump > piece.position;
      piece.position = jump;
      renderSnakeAll();
      showToast(wentUp ? "Ladder!" : "Snake!");
      messageEl.textContent = wentUp
        ? `${currentPlayer().name} ladder se ${jump} par gaya.`
        : `${currentPlayer().name} snake se ${jump} par aa gaya.`;
      finishSnakeMove(piece);
    }, 450);
    return;
  }

  finishSnakeMove(piece);
}

function finishSnakeMove(piece) {
  if (piece.position === 100) {
    gameOver = true;
    canRoll = false;
    piece.finished = true;
    messageEl.textContent = `${currentPlayer().name} wins Snakes and Ladders.`;
    statusEl.textContent = `${currentPlayer().name} wins`;
    diceBtn.disabled = true;
    renderSnakeAll();
    playWin();
    return;
  }

  if (lastRoll === 6) {
    canRoll = true;
    messageEl.textContent = `${currentPlayer().name} ko six mila, ek aur roll.`;
    updateTurnUi();
    maybeAiTurn();
    return;
  }

  messageEl.textContent = `${currentPlayer().name} ${piece.position} par hai. Next turn.`;
  window.setTimeout(nextTurn, 650);
}

function renderAll() {
  document.querySelectorAll(".token").forEach((token) => token.remove());
  const groups = groupTokensByLocation();

  groups.forEach((group, locationKey) => {
    const target = getLocationElement(locationKey);
    if (!target) return;
    group.forEach((token, offset) => {
      const tokenEl = document.createElement("button");
      tokenEl.type = "button";
      tokenEl.className = `token ${token.playerId} stack-${group.length}`;
      tokenEl.textContent = token.index + 1;
      tokenEl.dataset.tokenId = token.id;
      tokenEl.style.transform = stackTransform(group.length, offset);
      if (isMovable(token)) tokenEl.classList.add("movable");
      tokenEl.addEventListener("click", () => handleTokenClick(token.id));
      target.appendChild(tokenEl);
    });
  });

  renderScoreboard();
  updateBoardDice();
}

function groupTokensByLocation() {
  const groups = new Map();
  tokens.forEach((token) => {
    const location = getTokenLocation(token);
    if (!groups.has(location)) groups.set(location, []);
    groups.get(location).push(token);
  });
  return groups;
}

function getLocationElement(locationKey) {
  const [type, a, b] = locationKey.split(":");
  if (type === "yard") return yardSlots.get(`${a}-${b}`);
  return cells.get(key(Number(a), Number(b)));
}

function getTokenLocation(token) {
  if (token.steps < 0) return `yard:${token.playerId}:${token.index}`;
  const coords = coordsForSteps(token.playerId, token.steps);
  return `cell:${coords[0]}:${coords[1]}`;
}

function coordsForSteps(playerId, steps) {
  const player = players.find((item) => item.id === playerId) || PLAYERS.find((item) => item.id === playerId);
  if (steps < 51) return TRACK[(player.start + steps) % TRACK.length];
  return HOME_LANES[playerId][steps - 51];
}

function stackTransform(total, offset) {
  if (total === 1) return "";
  const positions = [
    [-18, -18], [18, -18], [-18, 18], [18, 18]
  ];
  const [x, y] = positions[offset] || [0, 0];
  return `translate(${x}%, ${y}%)`;
}

function renderScoreboard() {
  scoreboardEl.innerHTML = "";
  players.forEach((player, index) => {
    const snakePiece = snakePieces.find((piece) => piece.playerId === player.id);
    const finished = currentGame === "snake"
      ? snakePiece?.position || 1
      : tokens.filter((token) => token.playerId === player.id && token.finished).length;
    const row = document.createElement("div");
    row.className = `score-row ${index === currentPlayerIndex && !gameOver ? "active" : ""} ${player.active ? "" : "inactive"}`;
    row.innerHTML = `
      <span class="score-dot" style="background:${player.color}"></span>
      <span>
        <span class="score-name">${player.name}${player.ai ? " AI" : ""}</span>
        <span class="score-meta">${currentGame === "snake" ? "Board position" : player.rank ? `Rank #${player.rank}` : "Tokens home"}</span>
      </span>
      <span class="score-count">${currentGame === "snake" ? finished : `${finished}/4`}</span>
    `;
    scoreboardEl.appendChild(row);
  });
}

function updateTurnUi() {
  const player = currentPlayer();
  if (!player) return;
  const label = `${player.name}${player.ai ? " AI" : ""}`;
  turnLabel.textContent = `${label}'s turn`;
  rollHint.textContent = awaitingMove ? "Move token" : "Roll dice";
  diceBtn.disabled = gameOver || !canRoll || player.ai;
  statusEl.textContent = gameOver ? "Game complete" : `${label} ki baari`;
  if (boardTurnBadge) {
    boardTurnBadge.textContent = gameOver ? "Game Over" : `${player.name} ki chaal`;
  }
  statusEl.classList.toggle("active", !gameOver);
  rollHint.classList.toggle("active", !gameOver);
  document.documentElement.style.setProperty("--active-color", player.color);
  updateBoardDice();
}

function updateBoardDice() {
  const activePlayer = currentPlayer();
  boardDiceButtons.forEach((button, playerId) => {
    const playerInGame = players.some((player) => player.id === playerId);
    const isActive = activePlayer?.id === playerId && !gameOver;
    button.classList.toggle("hidden", !playerInGame);
    button.classList.toggle("active", isActive);
    button.disabled = !isActive || !canRoll || activePlayer?.ai;
    button.title = isActive ? `${activePlayer.name} ki dice roll karo` : "Is player ki baari nahi hai";
    button.setAttribute("aria-label", isActive ? `${activePlayer.name} ki dice roll karo` : "Inactive dice");
  });
}

function syncDiceFaces(value) {
  renderDiceFace(diceFace, value);
  boardDiceButtons.forEach((button, playerId) => {
    if (players.some((player) => player.id === playerId)) {
      renderDiceFace(button, value);
    }
  });
}

function renderDiceFace(target, value) {
  const pipMap = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
  };
  target.innerHTML = "";
  const faceValue = Number(value);
  if (!pipMap[faceValue]) {
    const placeholder = document.createElement("span");
    placeholder.className = "dice-placeholder";
    placeholder.textContent = "?";
    target.appendChild(placeholder);
    return;
  }
  const face = document.createElement("span");
  face.className = "dice-face";
  pipMap[faceValue].forEach((position) => {
    const pip = document.createElement("span");
    pip.className = `pip pos-${position}`;
    face.appendChild(pip);
  });
  target.appendChild(face);
}

function setDiceRolling(isRolling) {
  diceBtn.classList.toggle("rolling", isRolling);
  boardDiceButtons.forEach((button) => {
    button.classList.toggle("rolling", isRolling && button.classList.contains("active"));
  });
}

function currentPlayer() {
  return players[currentPlayerIndex];
}

function rollDice(playerId = null) {
  if (playerId && currentPlayer()?.id !== playerId) {
    showToast(`${currentPlayer().name} ki baari hai`);
    return;
  }
  if (!canRoll || gameOver) return;
  ensureAudio();
  canRoll = false;
  diceBtn.disabled = true;
  updateBoardDice();
  setDiceRolling(true);
  playTone(220, 0.07, "square");

  let ticks = 0;
  const interval = window.setInterval(() => {
    syncDiceFaces(Math.floor(Math.random() * 6) + 1);
    ticks += 1;
    if (ticks >= 9) {
      window.clearInterval(interval);
      lastRoll = Math.floor(Math.random() * 6) + 1;
      syncDiceFaces(lastRoll);
      setDiceRolling(false);
      if (currentGame === "snake") {
        afterSnakeRoll();
      } else {
        afterRoll();
      }
    }
  }, 55);
}

function afterRoll() {
  statusEl.textContent = `${currentPlayer().name} ne ${lastRoll} roll kiya`;
  const moves = getMovableTokens(currentPlayer());
  if (moves.length === 0) {
    messageEl.textContent = `${currentPlayer().name} ki baari thi: ${lastRoll} aaya, legal move nahi hai.`;
    playTone(120, 0.12, "sawtooth");
    renderAll();
    window.setTimeout(nextTurn, 850);
    return;
  }

  awaitingMove = true;
  messageEl.textContent = `${currentPlayer().name} ki baari hai. ${lastRoll} aaya, highlighted token chuno.`;
  renderAll();
  updateTurnUi();
  if (currentPlayer().ai) window.setTimeout(makeAiMove, 650);
}

function getMovableTokens(player) {
  return tokens.filter((token) => token.playerId === player.id && isLegalMove(token, lastRoll));
}

function isMovable(token) {
  return awaitingMove && token.playerId === currentPlayer().id && isLegalMove(token, lastRoll);
}

function isLegalMove(token, roll) {
  if (!roll || token.finished) return false;
  if (token.steps < 0) return roll === 6;
  return token.steps + roll <= 56;
}

function handleTokenClick(tokenId) {
  if (!awaitingMove || gameOver || currentPlayer().ai) return;
  const token = tokens.find((item) => item.id === tokenId);
  if (!token || !isMovable(token)) return;
  moveToken(token);
}

function moveToken(token) {
  awaitingMove = false;
  const fromYard = token.steps < 0;
  token.steps = fromYard ? 0 : token.steps + lastRoll;
  if (token.steps === 56) {
    token.finished = true;
    playTone(740, 0.14, "triangle");
    showToast(`${currentPlayer().name} brought a token home`);
  } else {
    playTone(420, 0.08, "sine");
  }

  const killed = captureOpponents(token);
  const winner = checkPlayerCompletion(currentPlayer());
  renderAll();

  if (winner) {
    concludePlayer(currentPlayer());
    return;
  }

  if (killed) {
    messageEl.textContent = `${currentPlayer().name} captured a token and gets another roll.`;
    canRoll = true;
  } else if (lastRoll === 6) {
    messageEl.textContent = `${currentPlayer().name} rolled a six and gets another roll.`;
    canRoll = true;
  } else {
    messageEl.textContent = `${currentPlayer().name} moved. Next turn.`;
    window.setTimeout(nextTurn, 650);
    return;
  }

  lastRoll = null;
  updateTurnUi();
  maybeAiTurn();
}

function captureOpponents(movedToken) {
  if (movedToken.steps < 0 || movedToken.steps > 50) return false;
  const trackIndex = (players.find((p) => p.id === movedToken.playerId).start + movedToken.steps) % TRACK.length;
  if (SAFE_TRACKS.has(trackIndex)) return false;

  let captured = false;
  tokens.forEach((token) => {
    if (token.playerId === movedToken.playerId || token.steps < 0 || token.steps > 50) return;
    const owner = players.find((p) => p.id === token.playerId);
    const opponentTrack = (owner.start + token.steps) % TRACK.length;
    if (opponentTrack === trackIndex) {
      token.steps = -1;
      token.finished = false;
      captured = true;
    }
  });

  if (captured) {
    playTone(180, 0.1, "square");
    window.setTimeout(() => playTone(520, 0.12, "triangle"), 90);
    showToast("Captured!");
  }
  return captured;
}

function checkPlayerCompletion(player) {
  return tokens.every((token) => token.playerId !== player.id || token.finished);
}

function concludePlayer(player) {
  const rank = players.filter((item) => item.rank).length + 1;
  player.rank = rank;
  player.active = false;
  renderAll();
  showToast(`${player.name} finished rank #${rank}`);

  const activePlayers = players.filter((item) => item.active);
  if (activePlayers.length <= 1) {
    if (activePlayers[0]) {
      activePlayers[0].rank = players.length;
      activePlayers[0].active = false;
    }
    gameOver = true;
    canRoll = false;
    awaitingMove = false;
    const champion = players.find((item) => item.rank === 1);
    messageEl.textContent = `${champion.name} wins the game.`;
    statusEl.textContent = `${champion.name} wins`;
    diceBtn.disabled = true;
    renderAll();
    playWin();
    return;
  }

  window.setTimeout(nextTurn, 900);
}

function nextTurn() {
  if (gameOver) return;
  lastRoll = null;
  awaitingMove = false;
  canRoll = true;
  do {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  } while (!currentPlayer().active);
  messageEl.textContent = `${currentPlayer().name}'s turn. Roll the dice.`;
  if (currentGame === "snake") {
    renderSnakeAll();
  } else {
    renderAll();
  }
  updateTurnUi();
  maybeAiTurn();
}

function maybeAiTurn() {
  updateTurnUi();
  if (!gameOver && currentPlayer().ai && canRoll) {
    window.setTimeout(rollDice, 650);
  }
}

function makeAiMove() {
  if (!awaitingMove || !currentPlayer().ai) return;
  const moves = getMovableTokens(currentPlayer());
  const chosen = chooseAiToken(moves);
  if (chosen) moveToken(chosen);
}

function chooseAiToken(moves) {
  const capturing = moves.find((token) => wouldCapture(token));
  if (capturing) return capturing;
  const finishing = moves.find((token) => token.steps >= 0 && token.steps + lastRoll === 56);
  if (finishing) return finishing;
  const leavingHome = moves.find((token) => token.steps < 0);
  if (leavingHome) return leavingHome;
  return moves.slice().sort((a, b) => b.steps - a.steps)[0];
}

function wouldCapture(token) {
  if (token.steps < 0) return false;
  const player = currentPlayer();
  const targetSteps = token.steps + lastRoll;
  if (targetSteps > 50) return false;
  const targetIndex = (player.start + targetSteps) % TRACK.length;
  if (SAFE_TRACKS.has(targetIndex)) return false;
  return tokens.some((other) => {
    if (other.playerId === token.playerId || other.steps < 0 || other.steps > 50) return false;
    const owner = players.find((p) => p.id === other.playerId);
    return (owner.start + other.steps) % TRACK.length === targetIndex;
  });
}

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, duration, type = "sine") {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.055, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playWin() {
  ensureAudio();
  [523, 659, 784, 1046].forEach((freq, index) => {
    window.setTimeout(() => playTone(freq, 0.16, "triangle"), index * 130);
  });
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toastEl.classList.remove("show"), 1500);
}

diceBtn.addEventListener("click", rollDice);
startBtn.addEventListener("click", createGame);
restartBtn.addEventListener("click", createGame);
gameTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentGame = tab.dataset.game;
    gameTabs.forEach((item) => item.classList.toggle("active", item === tab));
    createGame();
  });
});
modeSelect.addEventListener("change", () => {
  const isAi = modeSelect.value === "ai";
  playerCountSelect.value = isAi ? playerCountSelect.value : playerCountSelect.value;
});

createGame();
