let tourPopover = null;
let currentStep = 0;
let previousTarget = null;

const tutorialSteps = [
    {
        target: null, // No target for welcome screen
        text: "Welcome to Code Code Revolution! Let's show you how to play."
    },
    {
        target: ".gamewindow",
        text: "This is where code blocks falls or randomly popup. Complete them before the timer runs out!"
    },    
    {
        target: ".timer-container",
        text: "This is the countdown timer for each puzzle."
    },
    {
        target: ".playerinputwindow",
        text: "Click or type the missing characters here to fix the code."
    },
    {
        target: ".renderwindow",
        text: "This shows what the code should look like when it's written correctly."
    },
    {
        target: "#scoreVal",
        text: "Your score appears here during the game: +10 for each correct character, -10 for each wrong input."
    }
];


function startTutorial() {
    showTutorialStep(currentStep);
}

function showTutorialStep(stepIndex) {
    const step = tutorialSteps[stepIndex];
    const target = step.target ? document.querySelector(step.target) : null;

    if (previousTarget) {
        previousTarget.style.outline = "none";
        previousTarget.style.zIndex = "";
    }

    if (target) {
        target.style.outline = "9999em solid rgba(10, 10, 10, 0.5)";
        target.style.zIndex = "9998";
        previousTarget = target;
    }

    if (!tourPopover) {
        tourPopover = document.createElement("div");
        tourPopover.id = "tutorialPopover";
        tourPopover.style.cssText = `
            position: absolute;
            z-index: 9999;
            max-width: 250px;
            padding: 1em;
            background: white;
            border: 2px solid black;
            border-radius: 6px;
            box-shadow: 2px 2px 10px rgba(0,0,0,0.6);
        `;
        document.body.appendChild(tourPopover);
    }

    tourPopover.innerHTML = `
        <div>${step.text}</div>
        <div style="margin-top: 10px; text-align: right;">
            ${stepIndex > 0 ? `<button class="prev-btn">Previous</button>` : ""}
            <button class="next-btn">${stepIndex < tutorialSteps.length - 1 ? "Next" : "Start Playing!"}</button>
        </div>
    `;

    requestAnimationFrame(() => {
        positionPopover(target);
    });

    tourPopover.querySelector(".next-btn")?.addEventListener("click", () => {
        if (currentStep < tutorialSteps.length - 1) {
            currentStep++;
            showTutorialStep(currentStep);
        } else {
            endTutorial();
        }
    });

    tourPopover.querySelector(".prev-btn")?.addEventListener("click", () => {
        if (currentStep > 0) {
            currentStep--;
            showTutorialStep(currentStep);
        }
    });
}

function positionPopover(target) {
    const popover = tourPopover;
    const padding = 10;

    requestAnimationFrame(() => {
        const popoverRect = popover.getBoundingClientRect();
        let top, left;

        if (!target) {
            // Center of screen for welcome
            top = window.scrollY + (window.innerHeight / 2) - (popoverRect.height / 2);
            left = (window.innerWidth / 2) - (popoverRect.width / 2);
        } else {
            const rect = target.getBoundingClientRect();
            top = rect.bottom + window.scrollY + padding;
            if (top + popoverRect.height > window.innerHeight + window.scrollY) {
                top = rect.top + window.scrollY - popoverRect.height - padding;
            }
            left = rect.left + (rect.width / 2) - (popoverRect.width / 2);
        }

        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
    });
}

function endTutorial() {
    tourPopover?.remove();
    if (previousTarget) {
        previousTarget.style.outline = "none";
        previousTarget.style.zIndex = "";
    }

    // Redirect to game homepage
    setTimeout(() => {
        window.location.href = "game.html";
    }, 500);
}

// Game starts
document.getElementById("StartGame").addEventListener("click", () => {
    window.location.href = "game.html";
});

//Show tutorial
document.getElementById("howToPlay").addEventListener("click", () => {
    const welcomeScreen = document.querySelector(".welcomeScreen");
    const containerWrapper = document.querySelector(".container-wrapper");

    welcomeScreen.style.display = "none"
    containerWrapper.style.display = "flex"

    startTutorial();
});

// check if its from game.html tutorial
window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const skipWelcome = params.get("tutorial") === "true";

    const welcomeScreen = document.querySelector(".welcomeScreen");
    const containerWrapper = document.querySelector(".container-wrapper");

    if (skipWelcome) {
        welcomeScreen.style.display = "none";
        containerWrapper.style.display = "flex";
        startTutorial();
    }
});


//window.addEventListener("DOMContentLoaded", startTutorial);
