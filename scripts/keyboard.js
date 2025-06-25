// Shared handler for key input (keyboard or click)
function handleKeyInput(char, sourceButton = null) {
    if (isGamePaused) return;
    if (!window.expectedInputs || !window.typedInputs) return;

    const currentSegment = window.typedInputs.findIndex(
        (val, i) => val.length < window.expectedInputs[i].length
    );
    if (currentSegment === -1) return;

    const expectedChar = window.expectedInputs[currentSegment][
        window.typedInputs[currentSegment].length
    ];

    if (char.toLowerCase() === expectedChar.toLowerCase()) {
        window.typedInputs[currentSegment] += expectedChar;

        // Remove the used key from UI
        if (sourceButton) {
            sourceButton.remove(); // clicked button
        } else {
            // typed via keyboard: find and remove the matching key button
            const keyBtn = [...document.querySelectorAll('.key')].find(
                (btn) => btn.dataset.char.toLowerCase() === char.toLowerCase()
            );
            if (keyBtn) keyBtn.remove();
        }

        puzzleInteracted = true;
        addScore(10);
        updateCodeBlockFromTyped();
    } else {
        addScore(-10);
        flashScoreRed();
    }
}

// Listen for keyboard input
document.addEventListener('keydown', (e) => {
    if (isGamePaused) return;
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key))
        return;
    handleKeyInput(e.key);
});

// Listen for click on virtual key buttons
document.addEventListener('click', (e) => {
    if (isGamePaused) return;
    if (!e.target.classList.contains('key')) return;

    const char = e.target.dataset.char;
    handleKeyInput(char, e.target);
});