const gameArea = document.querySelector(".gamewindow");
const keysContainer = document.querySelector(".keys");
const renderedSolutionContainer = document.querySelector(".example-box");

window.addEventListener("DOMContentLoaded", () => {
  const devDialog = document.getElementById("devTool-input");
  const loadBtn = document.getElementById("devdialogButton");
  const levelSelect = document.getElementById("levelSelect");
  const puzzleInput = document.getElementById("puzzleNum");
  const gotoBtn = document.getElementById("gotoButton");

  // Show dialog immediately on load
  devDialog.showModal();

  loadBtn.addEventListener("click", async () => {
    const levelPath = levelSelect.value;
    const puzzleId = puzzleInput.value.trim();

    if (!levelPath || !puzzleId) return alert("Please enter both level and puzzle ID.");

    try {
      const res = await fetch(levelPath);
      const puzzles = await res.json();
      const puzzle = puzzles.find(p => String(p.id) === puzzleId); // use String() just in case

      if (!puzzle) {
        alert("Puzzle not found.");
        return;
      }

      currentPuzzle = puzzle; 
      spawnCodeBlock();       
      generateKeys(puzzle);   
      renderSolution(puzzle.solution, puzzle.type); 
      devDialog.close();      

    } catch (err) {
      console.error("Detailed error while loading puzzle:", err);
      alert(`Error loading puzzle: ${err.message}`);
    }

  });

  gotoBtn.addEventListener("click", () => {
    devDialog.showModal();
  });

});

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

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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