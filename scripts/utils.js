function showDialog(title = "Notice", message = "", buttonLabel = "OK", onConfirm = null) {
    const dialog = document.getElementById("gameDialog");
    const titleEl = document.getElementById("dialogTitle");
    const messageEl = document.getElementById("dialogMessage");
    const buttonEl = document.getElementById("dialogButton");

    titleEl.textContent = title;
    messageEl.textContent = message;
    buttonEl.textContent = buttonLabel;

    // Clear any previous event listeners
    const newButtonEl = buttonEl.cloneNode(true);
    buttonEl.parentNode.replaceChild(newButtonEl, buttonEl);

    newButtonEl.addEventListener("click", () => {
        dialog.close();
        if (typeof onConfirm === "function") {
            onConfirm();
        }
    });

    dialog.showModal();
}


// Help Dialog
const helpDialog = document.getElementById("help");
const btnHelp = document.getElementById("btn-help");

btnHelp.addEventListener("click", () => {
    pauseGame();
    helpDialog.showModal();
});

document.getElementById("closeHelp").addEventListener("click", () => {
    helpDialog.close();
});

// close on ESC
helpDialog.addEventListener("cancel", (e) => {
    e.preventDefault(); // prevent ESC from instantly closing
    helpDialog.close();
});


function showSolutionPopover(puzzle) {
    const timeoutPopover = document.getElementById("hintPopover");
    if (!timeoutPopover) return;

    const { broken, solution } = puzzle;

    if (!broken.includes("%input%")) {
        timeoutPopover.textContent = "Time’s up! No solution available.";
        timeoutPopover.showPopover();
        setTimeout(() => timeoutPopover.hidePopover(), 2400);
        return;
    }

    // Find all missing parts from the solution
    const brokenParts = broken.split("%input%");
    let currentIndex = 0;
    let result = "";

    for (let i = 0; i < brokenParts.length - 1; i++) {
        const partBefore = brokenParts[i];
        const partAfter = brokenParts[i + 1];

        const idxStart = solution.indexOf(partBefore, currentIndex) + partBefore.length;
        const idxEnd = partAfter ? solution.indexOf(partAfter, idxStart) : solution.length;

        const missingText = solution.slice(idxStart, idxEnd);
        result += escapeHTML(partBefore) + `<mark>${escapeHTML(missingText)}</mark>`;
        currentIndex = idxEnd;
    }

    result += escapeHTML(brokenParts.at(-1));

    // 🔒 Use pause logic to disable input
    pauseGame();

    timeoutPopover.innerHTML = `
    <div>
      <strong>Time’s up!</strong><br>
      Correct Answer:<br>
      <code>${result}</code>
    </div>
  `;

    try {
        timeoutPopover.showPopover();
    } catch (e) {
        console.warn("Popover issue:", e);
    }

    setTimeout(() => {
        if (timeoutPopover.matches(":popover-open")) {
            resumeGame();
            timeoutPopover.hidePopover();
        }
    }, 3400);
}



