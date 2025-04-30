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




