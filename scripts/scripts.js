// --- GLOBALS ---
let puzzles = [];
let currentPuzzle = null;
let currentLevel = 1;
let score = 0;
let completedPuzzleIds = new Set();
let isGamePaused = false;
let savedTimer = null;
let savedBlock = null;
let puzzleInteracted = false;
let totalPuzzlesInLevel = 0;

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
    const response = await fetch(`level/level-${levelNumber}.json`);
    const data = await response.json();
    puzzles = data;
    levelData = data;
    totalPuzzlesInLevel = levelData.length;
    currentLevel = levelNumber;
    completedPuzzleIds = new Set(); 
    loadRandomPuzzle();
  } catch (err) {
    console.error(`Failed to load level-${levelNumber}.json:`, err);

    // If no next level exists, show final dialog
    if (!window.hasShownCompletionAlert) {
      window.hasShownCompletionAlert = true;
      showDialog(
        "All Done!",
        "Great job!",
        "See Final Score",
        () => {
          window.location.href = "final.html";
        }
      );
    }
  }
}

function loadRandomPuzzle() {
  puzzleInteracted = false; // reset for next round
  // 🎯 Only show puzzles the user hasn't seen or interacted with
  const available = puzzles.filter(p => !completedPuzzleIds.has(p.id));

  const randomPuzzle = available[Math.floor(Math.random() * available.length)];
  currentPuzzle = randomPuzzle;

  //console.log("Loaded puzzle ID:", currentPuzzle.id);

  spawnCodeBlock();
  generateKeys(currentPuzzle);
  renderSolution(currentPuzzle.solution, currentPuzzle.type);
  //updateScore(score);

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
    if (currentPuzzle.previewHTML) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = currentPuzzle.previewHTML;
      const container = wrapper.firstElementChild;
      if (container) container.innerHTML = code;
      demoBox.appendChild(container || document.createTextNode(code));
    } else {
      demoBox.innerHTML = code;
    }
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

  // Validate and default spawn type
  const validSpawns = ["fall", "random"];
  const spawnType = validSpawns.includes(currentPuzzle.spawn) ? currentPuzzle.spawn : "fall";

  // Validate and default speed
  let speed = parseFloat(currentPuzzle.speed);
  if (isNaN(speed) || speed <= 0) speed = 10;

  if (spawnType === "random") {
    const positions = ["flex-start", "center", "flex-end"];
    gameArea.style.justifyContent = positions[Math.floor(Math.random() * positions.length)];

    gameArea.appendChild(block); // Append first to measure

    block.style.position = "absolute";

    const blockHeight = block.offsetHeight;
    const areaHeight = gameArea.offsetHeight;
    const maxBottom = Math.max(0, areaHeight - blockHeight - 10); // 10px padding

    const randomBottom = Math.floor(Math.random() * maxBottom);
    block.style.bottom = `${randomBottom}px`;

    block.style.opacity = "0";
    block.style.animation = `fadeInCode ${speed}s ease forwards`;
  } else {
    gameArea.style.justifyContent = "center";
    block.style.animation = `fallFromSky ${speed}s linear forwards`;
    gameArea.appendChild(block); // Append only here for "fall"
  }
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
document.getElementById('undoBtn').addEventListener('click', () => {
  if (!isGamePaused) {
    handleBackspace(); 
  }
});


// document.getElementById("clearBtn").addEventListener("click", () => {
//   window.typedChars = [];
//   updateCodeBlockFromTyped();
// });

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
    console.log(`Puzzle ${currentPuzzle.id} completed and interacted.`);
    puzzleInteracted = true;
    score += 100;
    updateScore(score);
  
    clearInterval(window.timerInterval);
    clearTimeout(window.timerTimeout);
  
    // ✅ Optionally show a quick message before moving on
    showGameMessage("Correct!", 800); 
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

      // Show solution before moving on
      if (puzzleInteracted && currentPuzzle) {
        showSolutionPopover(currentPuzzle);
        setTimeout(() => moveToNextPuzzle(), 3500); // wait before advancing
      } else {
        moveToNextPuzzle(); // already solved, move on immediately
      }
    }
  }, 1000);

  window.timerTimeout = setTimeout(() => {
    if (puzzleInteracted && currentPuzzle) {
      showSolutionPopover(currentPuzzle);
      setTimeout(() => moveToNextPuzzle(), 3500);
    } else {
      moveToNextPuzzle();
    }
  }, (seconds + 0.1) * 1000);
}


// --- NEXT PUZZLE ---
function moveToNextPuzzle() {
  if (puzzleInteracted && currentPuzzle && currentPuzzle.id) {
    completedPuzzleIds.add(currentPuzzle.id);
    localStorage.setItem('completedPuzzleIds', JSON.stringify([...completedPuzzleIds]));
    //console.log("Marked puzzle as completed (interacted):", currentPuzzle.id);
  }

  if (completedPuzzleIds.size >= totalPuzzlesInLevel) {
      showGameMessage(`Level ${currentLevel} complete! Loading Level ${currentLevel + 1}...`);

      setTimeout(() => {
          completedPuzzleIds.clear();
          loadLevel(currentLevel + 1);
      }, 2000);
  } else {
      loadRandomPuzzle();
  }
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
  }

  if (window.timerTimeout) {
    clearTimeout(window.timerTimeout);
    window.timerTimeout = null;
  }

  savedTimer = parseInt(timerDisplay.textContent, 10) || 0;
  document.querySelectorAll(".key").forEach(key => key.disabled = true);
}


function resumeGame() {
  if (!isGamePaused) return;
  isGamePaused = false;

  

  // Restore code block if saved
  if (savedBlock) {
    savedBlock.classList.remove("dummy");
    document.querySelector(".gamewindow").appendChild(savedBlock);
    savedBlock = null;
  }

  // Clear previous timers just to be safe
  clearTimeout(window.timerTimeout);
  clearInterval(window.timerInterval);

  if (savedTimer !== null) {
    let seconds = savedTimer;
    timerDisplay.textContent = seconds;

    window.timerInterval = setInterval(() => {
      if (isGamePaused) return;
      seconds--;
      timerDisplay.textContent = seconds;

      if (seconds <= 0) {
        clearInterval(window.timerInterval);
      }
    }, 1000);

    window.timerTimeout = setTimeout(() => {
      if (!isGamePaused) {
        console.log("⏰ Timer expired. puzzleInteracted:", puzzleInteracted);

        if (puzzleInteracted) {
          showSolutionPopover(currentPuzzle);
          pauseGame(true); // lock input while showing popover
          setTimeout(() => moveToNextPuzzle(), 3500);
        } else {
          moveToNextPuzzle();
        }
      }
    }, (seconds + 0.1) * 1000);
  }

  // Re-enable key inputs
  document.querySelectorAll(".key").forEach(key => key.disabled = false);
}

// PAUSE/PLAY TOGGLE POPOVER
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
      const current = window.typedInputs[i];
      if (current.length > 0) {
        const removedChar = current.slice(-1); // get last char
        window.typedInputs[i] = current.slice(0, -1); // remove last char

        // Restore visual key
        restoreKey(removedChar);

        break;
      }
    }
    updateCodeBlockFromTyped();
  }
}

// Backspace key listener
window.addEventListener("keydown", (e) => {
  if (!isGamePaused && e.key === "Backspace") {
    e.preventDefault();
    handleBackspace();
  }
});

// Restoring the key after undo
function restoreKey(char) {
  const keysContainer = document.querySelector('.keys');
  if (!keysContainer) return;

  const btn = document.createElement('button');
  btn.classList.add('key');
  btn.textContent = char;
  btn.dataset.char = char;

  btn.addEventListener('click', () => {
    handleKeyInput(char, btn);
  });

  keysContainer.appendChild(btn);
}




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

// Show Message
function showGameMessage(message, duration = 1500) {
  const popover = document.getElementById("hintPopover");
  if (!popover) return;

  popover.textContent = message;

  try {
    popover.showPopover();
  } catch (e) {
    // In case it's already showing or not supported
    console.warn("Popover issue:", e);
  }

  setTimeout(() => {
    if (popover.matches(":popover-open")) {
      popover.hidePopover();
    }
  }, duration);
}


