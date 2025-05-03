document.addEventListener("keydown", (e) => {
    // Skip modifier and non-character keys
    if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) return;

    if (!window.expectedInputs || !window.typedInputs) return;

    const currentSegment = window.typedInputs.findIndex((val, i) => val.length < window.expectedInputs[i].length);
    if (currentSegment === -1) return;

    const expectedChar = window.expectedInputs[currentSegment][window.typedInputs[currentSegment].length];

    if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
        window.typedInputs[currentSegment] += expectedChar; // use expectedChar to preserve original casing

        // Remove first matching key button (case-insensitive)
        const keyBtn = [...document.querySelectorAll(`.key`)].find(btn =>
            btn.dataset.char.toLowerCase() === e.key.toLowerCase()
        );
        if (keyBtn) keyBtn.remove();
        puzzleInteracted = true;
        addScore(10);
        updateCodeBlockFromTyped();
    } else {
        addScore(-10);
        flashScoreRed();
    }
});

document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("key")) return;

    const char = e.target.dataset.char;

    const currentSegment = window.typedInputs.findIndex((val, i) => val.length < window.expectedInputs[i].length);
    if (currentSegment === -1) return;

    const expectedChar = window.expectedInputs[currentSegment][window.typedInputs[currentSegment].length];

    if (char.toLowerCase() === expectedChar.toLowerCase()) {
        window.typedInputs[currentSegment] += expectedChar; // preserve correct case from puzzle

        // Remove clicked key
        e.target.remove();

        addScore(10);
        updateCodeBlockFromTyped();
    } else {
        addScore(-10);
        flashScoreRed();
    }
});
