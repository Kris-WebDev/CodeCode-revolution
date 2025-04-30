document.addEventListener("keydown", (e) => {
    // Skip modifier and non-character keys
    if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) return;

    if (!window.expectedInputs || !window.typedInputs) return;

    const currentSegment = window.typedInputs.findIndex((val, i) => val.length < window.expectedInputs[i].length);
    if (currentSegment === -1) return;

    const expectedChar = window.expectedInputs[currentSegment][window.typedInputs[currentSegment].length];

    if (e.key === expectedChar) {
        window.typedInputs[currentSegment] += e.key;

        // Remove first matching key button
        const keyBtn = document.querySelector(`.key[data-char="${e.key}"]`);
        if (keyBtn) keyBtn.remove();

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

    if (char === expectedChar) {
        window.typedInputs[currentSegment] += char;

        // Remove clicked key
        e.target.remove();

        addScore(10); // ✅ correct input
        updateCodeBlockFromTyped();
    } else {
        addScore(-10); // ❌ wrong input
        flashScoreRed();
    }
});
