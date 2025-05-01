// --- GLOBALS ---
let puzzles = [];
let currentPuzzle = null;
let currentLevel = 1;
let score = 0;
let completedPuzzleIds = new Set();
let isGamePaused = false;
let savedTimer = null;
let savedBlock = null;

window.isAdvancing = false;
window.timerInterval = null;
window.timerTimeout = null;

// --- DOM REFERENCES ---
const gameArea = document.querySelector(".gamewindow");
const keysContainer = document.querySelector(".keys");
const scoreVal = document.getElementById("scoreVal");
const renderedSolutionContainer = document.querySelector(".example-box");
const timerDisplay = document.querySelector(".timer");

// --- INIT ---
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("completedPuzzleIds");
  if (saved) {
    try {
      completedPuzzleIds = new Set(JSON.parse(saved));
    } catch (e) {
      console.warn("Failed to parse saved puzzle progress");
    }
  }

  const savedScore = localStorage.getItem("playerScore");
  if (savedScore) {
    score = parseInt(savedScore, 10);
    updateScore(score);
  }

  loadLevel(currentLevel);
});

// --- LOAD LEVEL ---
async function loadLevel(levelNumber = 1) {
  try {
    const response = await fetch(`level/level${levelNumber}.json`);
    puzzles = await response.json();
    loadRandomPuzzle();
  } catch (err) {
    console.error("Failed to load level:", err);
  }
}

function loadRandomPuzzle() {
  const available = puzzles.filter(p => !completedPuzzleIds.has(p.id));

  if (available.length === 0) {
    if (!window.hasShownCompletionAlert) {
      window.hasShownCompletionAlert = true;
      showDialog(
        "All Done!",
        "All puzzles completed! Great job!",
        "See Final Score",
        () => {
          window.location.href = "final.html";
        }
      );
    }
    return;
  }
  

  const randomPuzzle = available[Math.floor(Math.random() * available.length)];
  currentPuzzle = randomPuzzle;
  completedPuzzleIds.add(currentPuzzle.id);
  localStorage.setItem("completedPuzzleIds", JSON.stringify([...completedPuzzleIds]));


  spawnCodeBlock();
  generateKeys(currentPuzzle);
  renderSolution(currentPuzzle.solution, currentPuzzle.type);
  updateScore(score);

  startPuzzleTimer(currentPuzzle.timer || 10);
}

// --- RENDER SOLUTION PREVIEW ---
function renderSolution(code, type) {
  renderedSolutionContainer.innerHTML = "";

  const demoBox = document.createElement("div");
  demoBox.classList.add("demo");

  if (type === "css") {
    demoBox.innerHTML = currentPuzzle.previewHTML || "(no preview content)";
    const styleTag = document.createElement("style");
    styleTag.textContent = code;
    renderedSolutionContainer.append(demoBox, styleTag);
  } else if (type === "html") {
    demoBox.innerHTML = code;
    renderedSolutionContainer.appendChild(demoBox);
  } else {
    demoBox.textContent = "(no preview available)";
    renderedSolutionContainer.appendChild(demoBox);
  }
}

// --- SCORE ---
function updateScore(val) {
  score = val;
  scoreVal.textContent = val;
  localStorage.setItem("playerScore", val);
}

function addScore(amount) {
  score += amount;
  if (score < 0) score = 0;
  scoreVal.textContent = score;

  scoreVal.classList.remove("type-pop");
  void scoreVal.offsetWidth;
  scoreVal.classList.add("type-pop");
}

function flashScoreRed() {
  scoreVal.classList.remove("type-pop");
  void scoreVal.offsetWidth;

  scoreVal.classList.add("wrong-flash");
  setTimeout(() => {
    scoreVal.classList.remove("wrong-flash");
  }, 200);
}

// --- SPAWN CODE BLOCK ---
function spawnCodeBlock() {
  gameArea.querySelector(".code-block")?.remove();

  const block = document.createElement("div");
  block.classList.add("code-block");

  const broken = currentPuzzle.broken;

  if (broken.includes("%input%")) {
    block.innerHTML = broken.split("%input%").map((part, i, arr) => {
      return escapeHTML(part) + (i < arr.length - 1 ? `<span class="missing" data-index="${i}"></span>` : "");
    }).join("");

    const firstEmpty = block.querySelector(".missing:not(:has(*))");
    if (firstEmpty) firstEmpty.classList.add("blinking-cursor");
  } else {
    block.textContent = broken;
  }

  const positions = ["flex-start", "center", "flex-end"];
  gameArea.style.justifyContent = positions[Math.floor(Math.random() * positions.length)];

  gameArea.appendChild(block);
  block.style.animation = "fallFromSky 10s linear forwards";
}

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- GENERATE KEYS ---
function generateKeys(puzzle) {
  const brokenParts = puzzle.broken.split("%input%");
  const solution = puzzle.solution;

  let solutionInputs = [];
  let currentIndex = 0;

  for (let i = 0; i < brokenParts.length - 1; i++) {
    if (brokenParts[i]) {
      const idx = solution.indexOf(brokenParts[i], currentIndex);
      if (idx === -1) {
        console.warn(`Part "${brokenParts[i]}" not found.`);
        return;
      }
      currentIndex = idx + brokenParts[i].length;
    }

    const nextPart = brokenParts[i + 1];
    const nextIdx = nextPart ? solution.indexOf(nextPart, currentIndex) : solution.length;
    solutionInputs.push(solution.slice(currentIndex, nextIdx));
    currentIndex = nextIdx;
  }

  window.typedInputs = Array(solutionInputs.length).fill("");
  window.expectedInputs = solutionInputs;

  const allChars = solutionInputs.join("").split("");
  const shuffled = allChars.sort(() => Math.random() - 0.5);

  keysContainer.innerHTML = "";
  shuffled.forEach(char => {
    const key = document.createElement("button");
    key.classList.add("key");
    key.textContent = char;
    key.dataset.char = char;
    keysContainer.appendChild(key);
  });
}

// --- KEYBOARD ACTIONS ---
document.getElementById("undoBtn").addEventListener("click", () => {
  window.typedChars?.pop();
  updateCodeBlockFromTyped();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  window.typedChars = [];
  updateCodeBlockFromTyped();
});

function updateCodeBlockFromTyped() {
  const block = gameArea.querySelector(".code-block");
  const spans = block?.querySelectorAll(".missing");
  if (!block || !spans.length || !window.typedInputs) return;

  const flat = window.typedInputs.join("").split("");
  const expectedLengths = window.expectedInputs.map(e => e.length);

  let idx = 0;
  spans.forEach((span, i) => {
    const len = expectedLengths[i];
    const newText = flat.slice(idx, idx + len).join("");

    if (span.textContent !== newText) {
      span.textContent = newText;
      span.classList.remove("type-pop");
      void span.offsetWidth;
      span.classList.add("type-pop");
    }

    idx += len;
  });

  const pieces = currentPuzzle.broken.split("%input%");
  let attempt = "";
  pieces.forEach((piece, i) => {
    attempt += piece;
    if (i < spans.length) attempt += spans[i].textContent;
  });

  if (attempt === currentPuzzle.solution) {
    score += 100;
    updateScore(score);

    clearInterval(window.timerInterval);
    clearTimeout(window.timerTimeout);

    setTimeout(moveToNextPuzzle, 800);
  }
}

// --- TIMER ---
function startPuzzleTimer(seconds) {
  clearInterval(window.timerInterval);
  clearTimeout(window.timerTimeout);

  let timeLeft = seconds;
  timerDisplay.textContent = timeLeft;

  window.timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(window.timerInterval);
      moveToNextPuzzle();
    }
  }, 1000);

  window.timerTimeout = setTimeout(moveToNextPuzzle, (seconds + 0.1) * 1000);
}

// --- NEXT PUZZLE ---
function moveToNextPuzzle() {
  if (window.isAdvancing) return;
  window.isAdvancing = true;

  clearInterval(window.timerInterval);
  clearTimeout(window.timerTimeout);

  setTimeout(() => {
    loadRandomPuzzle();
    window.isAdvancing = false;
  }, 300);
}

// --- PAUSE & RESUME ---
function pauseGame() {
  if (isGamePaused) return;
  isGamePaused = true;

  const activeBlock = document.querySelector(".code-block");
  if (activeBlock) {
    savedBlock = activeBlock.cloneNode(true);
    activeBlock.remove();
  }

  if (window.timerInterval) {
    clearInterval(window.timerInterval);
    savedTimer = parseInt(timerDisplay.textContent, 10) || 0;
  }

  document.querySelectorAll(".key").forEach(key => key.disabled = true);
  //window.removeEventListener("keydown", handleTyping);
}

function resumeGame() {
  if (!isGamePaused) return;
  isGamePaused = false;

  if (savedBlock) {
    savedBlock.classList.remove("dummy");
    document.querySelector(".gamewindow").appendChild(savedBlock);
    savedBlock = null;
  }

  if (savedTimer !== null) {
    let seconds = savedTimer;
    window.timerInterval = setInterval(() => {
      if (isGamePaused) return;
      seconds--;
      timerDisplay.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(window.timerInterval);
        triggerTimeUp(); // must exist elsewhere
      }
    }, 1000);
  }

  document.querySelectorAll(".key").forEach(key => key.disabled = false);
  //window.addEventListener("keydown", handleTyping);
}


// PAUSE/PLAY TOGGLE
const pauseBtn = document.getElementById("pausePlay");
const pauseText = pauseBtn.querySelector(".pausePlaytxt");
const pausePopover = document.getElementById("hintPopover");

pausePopover.setAttribute("popover", "manual");
pausePopover.classList.add("pause-popover");

pauseBtn.addEventListener("click", () => {
  if (isGamePaused) {
    pausePopover.hidePopover();
    resumeGame();
    pauseText.textContent = "Pause";
  } else {
    pauseGame();
    pauseText.textContent = "Play";
    pausePopover.textContent = "Game Paused";
    pausePopover.showPopover();
  }
});



// HOOK BACKSPACE TO UNDO FUNCTION
function handleBackspace() {
  if (window.typedInputs && window.typedInputs.length > 0) {
    for (let i = window.typedInputs.length - 1; i >= 0; i--) {
      if (window.typedInputs[i].length > 0) {
        window.typedInputs[i] = window.typedInputs[i].slice(0, -1);
        break;
      }
    }
    updateCodeBlockFromTyped();
  }
}

document.getElementById("undoBtn").addEventListener("click", handleBackspace);

// Clear inputs
document.getElementById("clearBtn").addEventListener("click", () => {
  if (window.typedInputs) {
    window.typedInputs = Array(window.expectedInputs.length).fill("");
    updateCodeBlockFromTyped();
  }
});

// Backspace key listener
window.addEventListener("keydown", (e) => {
  if (!isGamePaused && e.key === "Backspace") {
    e.preventDefault();
    handleBackspace();
  }
});


// Clear local storage button combo. CTRL + ALT + X
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.altKey && e.code === "KeyX") {
    const confirmed = confirm("Clear all saved progress and score?");
    if (confirmed) {
      localStorage.removeItem("completedPuzzleIds");
      localStorage.removeItem("playerScore");
      location.reload();
    }
  }
});

// loader animation
window.addEventListener('load', () => {
  const loader = document.getElementById('loading-screen');
  if (loader) {
    setTimeout(() => {
      loader.style.display = 'none';
    }, 1000); // delay for 1 second
  }
});

