// How to Play Modal
document.getElementById("how-to-play-btn").onclick = () => {
  document.getElementById("how-to-play-modal").style.display = "flex";
};
document.getElementById("close-how-to-play").onclick = () => {
  document.getElementById("how-to-play-modal").style.display = "none";
};

// --- Dark Mode ---
const darkSwitch = document.getElementById("darkmode-switch");
darkSwitch.onchange = () => {
  document.body.classList.toggle("dark", darkSwitch.checked);
};

// --- Game Setup ---
const themeAvatars = [
  ["🦄", "🦊", "🐼", "🐧"],
  ["🌙", "⭐", "🦉", "🦇"],
  ["🧟", "🕸️", "🦇", "🎃"],
];
const themes = {
  classic: {
    boardColors: ["#f0e68c", "#fffacd"],
    snakeColor: "#d32f2f",
    ladderColor: "#388e3c",
    playerTokens: themeAvatars[0],
  },
  night: {
    boardColors: ["#263238", "#37474f"],
    snakeColor: "#ff5252",
    ladderColor: "#00e676",
    playerTokens: themeAvatars[1],
  },
  horror: {
    boardColors: ["#2d1b2d", "#3e223e"],
    snakeColor: "#b71c1c",
    ladderColor: "#8bc34a",
    playerTokens: themeAvatars[2],
  },
};

let selectedTheme = "classic";
let playerCount = 2;
let players = [];
let currentPlayer = 0;
let rolling = false;
let gameOver = false;
let moveHistory = [];
let doubleRoll = false;

const boardSize = 10;
const cellSize = 60;

// Snakes and ladders (same for all themes for now)
const snakes = { 16: 6, 48: 30, 62: 19, 88: 24, 95: 56, 97: 78 };
const ladders = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

// --- DOM Elements ---
const setupScreen = document.getElementById("setup-screen");
const gameContainer = document.getElementById("game-container");
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const rollBtn = document.getElementById("roll-dice");
const diceResult = document.getElementById("dice-result");
const statusDiv = document.getElementById("status");
const restartBtn = document.getElementById("restart-game");
const turnIndicator = document.getElementById("turn-indicator");
const moveHistoryDiv = document.getElementById("move-history");
const leaderboardDiv = document.getElementById("leaderboard");
const diceCube = document.getElementById("dice-cube");
const winModal = document.getElementById("win-modal");
const winMessage = document.getElementById("win-message");
const closeWinModal = document.getElementById("close-win-modal");
const powerupsBar = document.getElementById("powerups-bar");

// --- Sound Effects ---
const sfxDice = document.getElementById("sfx-dice");
const sfxSnake = document.getElementById("sfx-snake");
const sfxLadder = document.getElementById("sfx-ladder");
const sfxWin = document.getElementById("sfx-win");

// --- Player Name/Avatar Setup ---
const playerForm = document.getElementById("player-form");
const playerNamesDiv = document.getElementById("player-names");
const themeSelect = document.getElementById("theme-select");
const playerCountSelect = document.getElementById("player-count");

function renderPlayerInputs() {
  playerNamesDiv.innerHTML = "";
  let theme = themeSelect.value;
  let avatars = themes[theme].playerTokens;
  let count = parseInt(playerCountSelect.value);
  for (let i = 0; i < count; i++) {
    let div = document.createElement("div");
    div.style.margin = "10px 0";
    div.innerHTML = `
      <span class="avatar-select selected" data-player="${i}" data-avatar="${
      avatars[i]
    }">${avatars[i]}</span>
      <input type="text" class="player-name-input" placeholder="Player ${
        i + 1
      } Name" value="Player ${i + 1}" maxlength="12" data-player="${i}">
    `;
    playerNamesDiv.appendChild(div);
  }
}
themeSelect.onchange = renderPlayerInputs;
playerCountSelect.onchange = renderPlayerInputs;
renderPlayerInputs();

// --- Avatar Selection ---
playerNamesDiv.addEventListener("click", function (e) {
  if (e.target.classList.contains("avatar-select")) {
    let idx = e.target.getAttribute("data-player");
    let all = playerNamesDiv.querySelectorAll(
      `.avatar-select[data-player="${idx}"]`
    );
    all.forEach((a) => a.classList.remove("selected"));
    e.target.classList.add("selected");
  }
});

// --- Start Game ---
playerForm.onsubmit = (e) => {
  e.preventDefault();
  selectedTheme = themeSelect.value;
  playerCount = parseInt(playerCountSelect.value);
  players = [];
  let avatars = themes[selectedTheme].playerTokens;
  for (let i = 0; i < playerCount; i++) {
    let name =
      playerNamesDiv.querySelector(`input[data-player="${i}"]`).value.trim() ||
      `Player ${i + 1}`;
    let avatar = playerNamesDiv.querySelector(
      `.avatar-select[data-player="${i}"].selected`
    );
    avatar = avatar ? avatar.textContent : avatars[i];
    players.push({
      pos: 0,
      token: avatar,
      name: name,
      stats: { snakes: 0, ladders: 0, battles: 0, rolls: 0 },
      powerups: { shield: 1, double: 1 },
      shielded: false,
    });
  }
  currentPlayer = 0;
  rolling = false;
  gameOver = false;
  diceResult.textContent = "";
  statusDiv.textContent = "";
  rollBtn.disabled = false;
  restartBtn.style.display = "none";
  moveHistory = [];
  doubleRoll = false;
  updateMoveHistory();
  gameContainer.className = "theme-" + selectedTheme;
  setupScreen.style.display = "none";
  gameContainer.style.display = "block";
  updateTurnIndicator();
  drawBoard();
  updateLeaderboard();
  renderPowerups();
};

// --- Powerups ---
function renderPowerups() {
  let p = players[currentPlayer];
  powerupsBar.innerHTML = `
    <button class="powerup-btn shield" id="powerup-shield" ${
      p.powerups.shield <= 0 || p.shielded ? "disabled" : ""
    } title="Block next snake or battle!">🛡️ Shield${
    p.shielded ? " (Active)" : ""
  }</button>
    <button class="powerup-btn double" id="powerup-double" ${
      p.powerups.double <= 0 ? "disabled" : ""
    } title="Roll twice this turn!">🎲x2 Double Roll</button>
    <span class="stats-bar">Snakes: ${p.stats.snakes} | Ladders: ${
    p.stats.ladders
  } | Battles: ${p.stats.battles} | Rolls: ${p.stats.rolls}</span>
  `;
  document.getElementById("powerup-shield").onclick = () => {
    if (p.powerups.shield > 0 && !p.shielded) {
      p.shielded = true;
      p.powerups.shield--;
      renderPowerups();
      statusDiv.textContent =
        "🛡️ Shield activated! Next snake or battle will be blocked.";
    }
  };
  document.getElementById("powerup-double").onclick = () => {
    if (p.powerups.double > 0 && !doubleRoll) {
      doubleRoll = true;
      p.powerups.double--;
      renderPowerups();
      statusDiv.textContent =
        "🎲 Double Roll activated! You will roll twice this turn.";
    }
  };
}

// --- Turn Indicator, Move History, Leaderboard ---
function updateTurnIndicator() {
  turnIndicator.innerHTML = `Current Turn: <span style="font-size:1.5rem;">${players[currentPlayer].token}</span> <b>${players[currentPlayer].name}</b>`;
  renderPowerups();
}
function updateMoveHistory() {
  if (moveHistory.length === 0) {
    moveHistoryDiv.innerHTML = "<em>No moves yet.</em>";
    return;
  }
  moveHistoryDiv.innerHTML =
    "<strong>Move History:</strong><br>" +
    moveHistory
      .slice(-5)
      .reverse()
      .map((m) => m)
      .join("<br>");
}
function updateLeaderboard() {
  let sorted = players
    .map((p, i) => ({ ...p, idx: i }))
    .sort((a, b) => b.pos - a.pos);
  leaderboardDiv.innerHTML =
    `<div style="font-weight:bold; margin-bottom:8px;">Leaderboard</div>` +
    sorted
      .map(
        (p, rank) => `
      <div class="leaderboard-player" style="${
        rank === 0 ? "font-size:1.1em;" : ""
      }">
        <span class="avatar">${p.token}</span>
        <span>${p.name}</span>
        <div class="progress-bar"><div class="progress-bar-inner" style="width:${
          p.pos
        }%"></div></div>
        <span style="font-size:0.95em; color:#888;">${p.pos}</span>
      </div>
    `
      )
      .join("");
}

// --- Drawing Functions ---
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw cells
  for (let i = 0; i < 100; i++) {
    let x = (i % boardSize) * cellSize;
    let y = canvas.height - Math.floor(i / boardSize + 1) * cellSize;
    let colorIdx = Math.floor(i / boardSize) % 2;
    // Highlight start and finish
    if (i + 1 === 1) {
      ctx.fillStyle = "#e0ffe0";
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = "#388e3c";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, cellSize, cellSize);
      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#388e3c";
      ctx.fillText("🚩 1", x + 8, y + 28);
    } else if (i + 1 === 100) {
      ctx.fillStyle = "#ffe0e0";
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = "#d32f2f";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, cellSize, cellSize);
      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#d32f2f";
      ctx.fillText("100 🏁", x + 8, y + 28);
    } else {
      ctx.fillStyle = themes[selectedTheme].boardColors[(colorIdx + i) % 2];
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2.2;
      ctx.strokeRect(x, y, cellSize, cellSize);
      ctx.font = "bold 16px Arial";
      ctx.fillStyle = selectedTheme === "night" ? "#fff" : "#333";
      ctx.fillText(i + 1, x + 8, y + 26);
    }
  }
  // Draw snakes and ladders
  for (let [start, end] of Object.entries(snakes)) {
    drawLine(start, end, themes[selectedTheme].snakeColor, true);
  }
  for (let [start, end] of Object.entries(ladders)) {
    drawLine(start, end, themes[selectedTheme].ladderColor, false);
  }
  // Draw players
  players.forEach((p, idx) => {
    let { x, y } = getCellCoords(p.pos);
    ctx.font = "32px Arial";
    ctx.save();
    if (idx === currentPlayer) ctx.shadowColor = "#ffeb3b";
    if (idx === currentPlayer) ctx.shadowBlur = 18;
    ctx.fillText(p.token, x + 10 + idx * 10, y + 44);
    ctx.restore();
    if (p.shielded) {
      ctx.font = "18px Arial";
      ctx.fillText("🛡️", x + 38 + idx * 10, y + 18);
    }
  });
}

function getCellCoords(pos) {
  if (pos === 0) return { x: 0, y: canvas.height - cellSize };
  let n = pos - 1;
  let row = Math.floor(n / boardSize);
  let col = n % boardSize;
  if (row % 2 === 1) col = boardSize - 1 - col;
  let x = col * cellSize;
  let y = canvas.height - (row + 1) * cellSize;
  return { x, y };
}

function drawLine(start, end, color, isSnake) {
  let from = getCellCoords(Number(start));
  let to = getCellCoords(Number(end));
  ctx.beginPath();
  ctx.moveTo(from.x + cellSize / 2, from.y + cellSize / 2);
  ctx.lineTo(to.x + cellSize / 2, to.y + cellSize / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = isSnake ? 6 : 4;
  ctx.setLineDash(isSnake ? [10, 8] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

// --- Game Logic ---
rollBtn.onclick = async function () {
  if (rolling || gameOver) return;
  rolling = true;
  await animateDiceRoll();
  rolling = false;
};

async function animateDiceRoll() {
  let dice = 1;
  let rollTimes = 10 + Math.floor(Math.random() * 6);
  sfxDice.currentTime = 0;
  sfxDice.play();
  for (let i = 0; i < rollTimes; i++) {
    dice = Math.floor(Math.random() * 6) + 1;
    diceCube.textContent = dice;
    diceCube.style.transform = `rotateY(${i * 36}deg) scale(${
      1 + Math.sin(i / 2) * 0.1
    })`;
    await sleep(60 + i * 5);
  }
  diceCube.textContent = dice;
  diceCube.style.transform = "";
  await animateMove(dice);
  if (doubleRoll) {
    doubleRoll = false;
    statusDiv.textContent = "🎲 Double Roll! Rolling again...";
    await sleep(900);
    await animateDiceRoll();
  }
}

async function animateMove(steps) {
  let player = players[currentPlayer];
  let startPos = player.pos;
  player.stats.rolls++;
  for (let i = 0; i < steps; i++) {
    if (player.pos < 100) player.pos++;
    drawBoard();
    updateLeaderboard();
    await sleep(200);
  }
  let moveMsg = `<b>${player.name}</b> ${player.token} rolled <b>${steps}</b> and moved from <b>${startPos}</b> to <b>${player.pos}</b>`;
  // Check for snake or ladder
  if (snakes[player.pos]) {
    if (player.shielded) {
      player.shielded = false;
      moveMsg += ` 🛡️ Blocked a snake!`;
      statusDiv.textContent = "🛡️ Shield blocked the snake!";
    } else {
      sfxSnake.currentTime = 0;
      sfxSnake.play();
      await animateEvent(player.pos, snakes[player.pos], "snake");
      moveMsg += ` 🐍 (snake to <b>${snakes[player.pos]}</b>)`;
      player.pos = snakes[player.pos];
      player.stats.snakes++;
    }
  } else if (ladders[player.pos]) {
    sfxLadder.currentTime = 0;
    sfxLadder.play();
    await animateEvent(player.pos, ladders[player.pos], "ladder");
    moveMsg += ` 🪜 (ladder to <b>${ladders[player.pos]}</b>)`;
    player.pos = ladders[player.pos];
    player.stats.ladders++;
  }
  drawBoard();
  updateLeaderboard();
  // Battle event: if any other player is on same square, send them to start
  for (let i = 0; i < players.length; i++) {
    if (
      i !== currentPlayer &&
      players[i].pos === player.pos &&
      player.pos !== 0
    ) {
      if (players[i].shielded) {
        players[i].shielded = false;
        moveMsg += ` 🛡️ Blocked a battle!`;
        statusDiv.textContent = `🛡️ ${players[i].name}'s shield blocked the battle!`;
      } else if (player.shielded) {
        player.shielded = false;
        moveMsg += ` 🛡️ Blocked a battle!`;
        statusDiv.textContent = `🛡️ ${player.name}'s shield blocked the battle!`;
      } else {
        moveMsg += ` ⚔️ (knocked ${players[i].name} to start)`;
        statusDiv.textContent = `⚔️ ${player.name} knocks ${players[i].name} back to start!`;
        players[i].pos = 0;
        player.stats.battles++;
        drawBoard();
        updateLeaderboard();
        await sleep(800);
      }
    }
  }
  moveHistory.push(moveMsg);
  updateMoveHistory();
  // Win check
  if (player.pos === 100) {
    sfxWin.currentTime = 0;
    sfxWin.play();
    showWinModal(currentPlayer);
    rollBtn.disabled = true;
    restartBtn.style.display = "inline-block";
    gameOver = true;
    confetti();
    return;
  }
  // Next player
  currentPlayer = (currentPlayer + 1) % players.length;
  updateTurnIndicator();
  statusDiv.textContent = `Player ${players[currentPlayer].name}'s turn (${players[currentPlayer].token})`;
}

async function animateEvent(from, to, type) {
  let emoji = type === "snake" ? "🐍" : "🪜";
  statusDiv.textContent = `${emoji} ${
    type === "snake" ? "Oh no!" : "Yay!"
  } Moving to ${to}`;
  await sleep(700);
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// --- Confetti Animation on Win ---
function confetti() {
  // Simple emoji confetti
  let confettiDiv = document.createElement("div");
  confettiDiv.style.position = "fixed";
  confettiDiv.style.left = 0;
  confettiDiv.style.top = 0;
  confettiDiv.style.width = "100vw";
  confettiDiv.style.height = "100vh";
  confettiDiv.style.pointerEvents = "none";
  confettiDiv.style.zIndex = 9999;
  document.body.appendChild(confettiDiv);

  let emojis = ["🎉", "🎊", "✨", "🥳", "🪄", "🟡", "🟣", "🟢"];
  let count = 40;
  for (let i = 0; i < count; i++) {
    let span = document.createElement("span");
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.style.position = "absolute";
    span.style.left = Math.random() * 100 + "vw";
    span.style.top = "-2rem";
    span.style.fontSize = 1.2 + Math.random() * 1.8 + "rem";
    span.style.transition =
      "top 1.8s cubic-bezier(.23,1.02,.64,1), transform 1.8s";
    confettiDiv.appendChild(span);
    setTimeout(() => {
      span.style.top = 60 + Math.random() * 30 + "vh";
      span.style.transform = `rotate(${Math.random() * 360}deg)`;
    }, 10 + i * 20);
  }
  setTimeout(() => confettiDiv.remove(), 2200);
}

// --- Win Modal Logic ---
function showWinModal(winnerIdx) {
  winMessage.innerHTML = `<span style="font-size:2rem;">${players[winnerIdx].token}</span> <b>${players[winnerIdx].name}</b> wins!`;
  winModal.style.display = "flex";
}
closeWinModal.onclick = () => {
  winModal.style.display = "none";
  setupScreen.style.display = "block";
  gameContainer.style.display = "none";
};

// --- Restart Logic ---
restartBtn.onclick = () => {
  setupScreen.style.display = "block";
  gameContainer.style.display = "none";
  winModal.style.display = "none";
};

// --- Initial State ---
setupScreen.style.display = "block";
gameContainer.style.display = "none";
winModal.style.display = "none";
