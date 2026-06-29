// ***INITIALIZATION***

const DB_NAME = "sprint_manager";
const DB_VERSION = 1;

let db;
let cardCtn = 0;
let columnsTab;
let cardsTab;
let tagsTab;
let selectedTags = [];
let tagColors = ["bg-red-200", "bg-green-200", "bg-blue-200", "bg-yellow-100", "bg-purple-200", "bg-pink-200"];
let selectedTagColors = ["bg-red-400", "bg-green-400", "bg-blue-400", "bg-yellow-300", "bg-purple-400", "bg-pink-400"];

const columnContainer = document.getElementById("columnContainer");

const addCardModal = document.getElementById("addCardModal");
const closeAddCardModalBtn = document.getElementById("closeAddCardModalBtn");
const addCardForm = document.getElementById("addCardForm");
const addCardSubmitBtn = document.getElementById("createCardBtn");

const addColModal = document.getElementById("addColModal");
const closeAddColModalBtn = document.getElementById("closeAddColModalBtn");
const submitNewCategoryBtn = document.getElementById("submitNewColBtn");
const addColForm = document.getElementById("addColForm");

const existingTagsContainer = document.getElementById("existingTagsContainer");
const newTagInput = document.getElementById("newTagInput");
const addNewTagBtn = document.getElementById("addNewTagBtn");

const confirmModal = document.getElementById("confirmModal");
const closeConfirmModalBtn = document.getElementById("closeConfirmModalBtn");
const yesConfirmBtn = document.getElementById("yesConfirmBtn");
const noConfirmBtn = document.getElementById("noConfirmBtn");

const trashEl = document.getElementById("trashcan");
const stopAskingBox = document.getElementById("stopConfirmingBox");

let draggedElement = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let stopAsking = false;

const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onerror = () => {
    console.error("Error opening database:", request.error);
}

request.onsuccess = () => {
    db = request.result;

    loadBoardData().then(() => {
        renderBoard().then(() => {
            const addColBtn = document.getElementById("addColBtn");
            addColBtn.addEventListener("click", () => {
                openModal(addColModal, addColForm);
            });
        });
    });
}

request.onupgradeneeded = () => {
    db = request.result;

    const columnsStore = db.createObjectStore("columns", {
        keyPath: "id"
    });

    columnsStore.createIndex("order", "order", { unique: false });

    const cardsStore = db.createObjectStore("cards", {
        keyPath: "id"
    });

    cardsStore.createIndex("cardId", "cardId", { unique: false });
    cardsStore.createIndex("tagIds", "tags", { unique: false });

    const tagsStore = db.createObjectStore("tags", {
        keyPath: "id"
    });

    tagsStore.createIndex("tagId", "tagId", { unique: true });
    tagsStore.createIndex("name", "name", { unique: true });

    document.cookie = "stopAsking=false; SameSite=None; Secure";

    seedDefaultColumns(columnsStore, cardsStore, tagsStore);
}







// ***ACTIVE LOGIC***










// ***HELPER FUNCTIONS***

// Database interaction handling

function seedDefaultColumns(columnsStore, cardsStore, tagsStore) {
    // starter columns
    columnsStore.add({
        id: "done",
        title: "Done",
        order: 1,
    });

    columnsStore.add({
        id: "chores",
        title: "Basic Chores",
        order: 2,
    });

    // starter card/task
    cardsStore.add({
        id: crypto.randomUUID(),
        columnId: "chores",
        title: "Example Task",
        description: "Drag me to \"Done\" to move me to that category, or to the trash can on the bottom left to delete me",
        tagIds: [],
        time: 4,
        order: 1,
    });

    cardsStore.add({
        id: crypto.randomUUID(),
        columnId: "done",
        title: "Create your own categories -->",
        description: "Just name your category and a new column will be added",
        tagIds: [],
        time: 0.5,
        order: 1,
    });

    cardsStore.add({
        id: crypto.randomUUID(),
        columnId: "chores",
        title: "Advance settings",
        description: "You can delete categories or reset your board back to the default by pressing the cog wheel on the top right of your screen",
        tagIds: [],
        time: 1.5,
        order: 1,
    });
}

function getStore(storeName, mode = "readwrite") {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}

async function getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadBoardData() {
    columnsTab = await getAllFromStore("columns");
    cardsTab = await getAllFromStore("cards");
    tagsTab = await getAllFromStore("tags");
}

function removeCard(cardData) {
    const cardStore = getStore("cards");
    const request = cardStore.delete(cardData.id);

    request.onsuccess = () => {
        closeModal(confirmModal);
        renderBoard();
    }

    request.onerror = () => {
        console.error("Unable to delete card:", error);
    }
}



// Click and drag handling

function startDrag(event) {
    draggedElement = event.currentTarget;

    const rect = draggedElement.getBoundingClientRect();

    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;

    draggedElement.setPointerCapture(event.pointerId);

    draggedElement.style.width = `${rect.width}px`;
    draggedElement.style.position = "fixed";
    draggedElement.style.left = `${event.clientX - dragOffsetX}px`;
    draggedElement.style.top = `${event.clientY - dragOffsetY}px`;
    draggedElement.style.zIndex = "2";
    draggedElement.style.pointerEvents = "none";

    draggedElement.classList.remove("cursor-grab");
    draggedElement.classList.add("cursor-grabbing", "opacity-80");

    document.addEventListener("pointermove", moveDrag);
    document.addEventListener("pointerup", endDrag);
}

function moveDrag(event) {
    if (!draggedElement) return;

    draggedElement.style.left = `${event.clientX - dragOffsetX}px`;
    draggedElement.style.top = `${event.clientY - dragOffsetY}px`;

    const elementUnderPointer = document.elementFromPoint(event.clientX, event.clientY);

    if (elementUnderPointer && elementUnderPointer.id === "trashcan") {
        elementUnderPointer.src = "./assets/bin-open.png";
    } else {
        trashEl.src = "./assets/bin-closed.png";
    }
}

function endDrag(event) {
    if (!draggedElement) return;

    const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
    const colTarget = dropTarget?.closest("[data-column-id]");
    const trashTarget = dropTarget.id === "trashcan" ? dropTarget : null;

    draggedElement.style.position = "";
    draggedElement.style.left = "";
    draggedElement.style.top = "";
    draggedElement.style.width = "";
    draggedElement.style.zIndex = "";
    draggedElement.style.pointerEvents = "";

    draggedElement.classList.remove("cursor-grabbing", "opacity-80");
    draggedElement.classList.add("cursor-grab");

    const cardId = draggedElement.dataset.cardId;
    const cardData = cardsTab.find((card) => card.id === cardId);
    stopAsking = document.cookie.split("; ").find((row) => row.startsWith("stopAsking"))?.split("=")[1] === "true";

    if (colTarget) {
        const newColId = colTarget.dataset.columnId;

        colTarget.appendChild(draggedElement);

        if (cardData) {
            const cardsStore = getStore("cards");
            const getRequest = cardsStore.get(cardId);

            getRequest.onsuccess = () => {
                const card = getRequest.result;

                if (!card) {
                    console.error("Card not found:", cardId);
                    return;
                }

                card.columnId = newColId;

                const putRequest = cardsStore.put(card);

                putRequest.onerror = () => {
                    console.error("Failed to save moved card:", putRequest.error);
                    return;
                }

                draggedElement = null;

                renderBoard();
            }

            getRequest.onerror = () => {
                console.error("Failed to get card:", getRequest.error);
            }
        }
    }
    else if (trashTarget && !stopAsking) {
        openModal(confirmModal);

        closeConfirmModalBtn.addEventListener("click", () => {
            closeModal(confirmModal);
        });

        noConfirmBtn.addEventListener("click", () => {
            closeModal(confirmModal);
        });

        yesConfirmBtn.addEventListener("click", () => {
            removeCard(cardData);

            if (stopAskingBox.checked) {
                document.cookie = "stopAsking=true; SameSite=None; Secure";
            }
        });
    } else if (trashTarget && stopAsking) {
        removeCard(cardData);
    }

    document.removeEventListener("pointermove", moveDrag);
    document.removeEventListener("pointerup", endDrag);
}



// Rendering

async function renderBoard() {
    columnContainer.innerHTML = "";
    await loadBoardData();

    columnsTab.forEach(column => {
        const columnEl = createColumnElement(column);
        columnEl.dataset.columnId = column.id;

        cardsTab.forEach(card => {
            if (card.columnId === column.id) {
                const cardEl = createCardElement(card);
                cardEl.dataset.cardId = card.id;
                columnEl.appendChild(cardEl);
                cardEl.addEventListener("pointerdown", (event) => {
                    startDrag(event);
                });
            }
        });

        columnContainer.appendChild(columnEl);
    });

    const addCategoryCol = document.createElement("div");
    addCategoryCol.classList = "flex flex-none"
    const addCategoryLabel = document.createElement("h6");
    addCategoryLabel.innerText = "New category";
    addCategoryCol.className = "font-bold text-xl flex flex-col items-center bg-primary-gray rounded-xl mb-32 p-2 text-mist-400";
    const addColBtn = document.createElement("button");
    addColBtn.id = "addColBtn";
    addColBtn.className = "size-12 my-5 bg-radial from-teal-500 to-teal-700 border-black border-3 rounded-xl cursor-pointer flex items-center justify-center flex-none";
    addColBtn.innerHTML = `<h2 id="addColBtn" class="font-bold text-black text-3xl p-2">+</h2>`;

    addCategoryCol.appendChild(addCategoryLabel);
    addCategoryCol.appendChild(addColBtn);
    columnContainer.appendChild(addCategoryCol);
}

function renderTagButtons() {
    existingTagsContainer.innerHTML = "";

    tagsTab.forEach(tag => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = tag.name;

        const isSelected = selectedTags.includes(tag.id);

        button.className = isSelected
            ? `border-2 border-black rounded px-2 py-1 m-1 cursor-pointer focus:opacity-70 ${selectedTagColors[tagsTab.indexOf(tag) % selectedTagColors.length]}`
            : `border-2 rounded px-2 py-1 m-1 cursor-pointer focus:opacity-50 opacity-70 ${tagColors[tagsTab.indexOf(tag) % tagColors.length]}`;

        button.addEventListener("click", () => {
            if (selectedTags.includes(tag.id)) {
                selectedTags = selectedTags.filter((id) => id !== tag.id);
            } else {
                selectedTags.push(tag.id);
            }

            renderTagButtons();
        });

        existingTagsContainer.appendChild(button);
    });
}



// Modal handling

function openModal(modal, form) {
    form.reset();
    renderTagButtons();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function openModal(modal) {
    renderTagButtons();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeModal(modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}



// Element generation

function createColumnElement(column) {
    // Column container
    const columnDiv = document.createElement("div");
    columnDiv.id = `column-${column.id}`;
    columnDiv.className = "bg-primary-gray rounded-xl p-4 flex-1 flex flex-col flex-auto gap-4 min-w-70";

    // Column header
    const headerCont = document.createElement("div");
    headerCont.id = `columnHeader-${column.id}`;
    headerCont.className = "relative bg-radial from-teal-700 to-teal-900 from-60% text-black rounded-xl border-3 border-black p-4";

    const header = document.createElement("h2");
    header.id = `columnTitle-${column.id}`;
    header.className = "text-xl font-bold text-center";
    header.textContent = column.title;

    const addCardBtn = document.createElement("button");
    addCardBtn.id = `addCardBtn-${column.id}`;
    addCardBtn.className = "absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-radial from-emerald-500 to-emerald-600 opacity-60 to-70% border-3 border-black rounded-xl cursor-pointer flex items-center justify-center";
    addCardBtn.innerHTML = `<h2 class="font-bold text-black text-3xl">+</h2>`;

    columnDiv.appendChild(headerCont);
    headerCont.appendChild(header);
    headerCont.appendChild(addCardBtn);

    addCardBtn.addEventListener("click", () => {
        openModal(addCardModal, addCardForm, closeAddCardModalBtn);
        addCardForm.dataset.columnId = column.id;
    });

    return columnDiv;
}

function createCardElement(cardData) {
    // Card container
    const card = document.createElement("div");
    card.id = `card-${++cardCtn}`;
    card.className = "bg-white font-bold bg-mauve-to-pink rounded-lg border-2 border-gray-300 shadow-sm p-3 text-left flex flex-col gap-2 cursor-grab";

    // Title
    const title = document.createElement("h3");
    title.id = `cardTitle-${cardCtn}`;
    title.className = "text-lg font-semibold";
    title.textContent = cardData.title;

    // Description
    const description = document.createElement("p");
    description.id = `cardDescription-${cardCtn}`;
    description.className = "text-gray-900 text-sm mt-2";
    description.textContent = cardData.description;

    // Priority / Time container
    const infoContainer = document.createElement("div");
    infoContainer.id = `cardInfo-${cardCtn}`;
    infoContainer.className = "flex justify-between mt-4 text-sm";

    // Priority span
    const tags = document.createElement("span");
    tags.id = `cardTag-${cardCtn}`;
    for (let i = 0; i < cardData.tagIds.length; i++) {
        const request = getAllFromStore("tags");

        request.then((result) => {
            const tag = result.filter((tag) => tag.id === cardData.tagIds[i])[0];
            const tagDisplay = document.createElement("p");

            tagDisplay.textContent = tag["name"];
            tagDisplay.className = `border-2 rounded px-2 py-1 m-1 focus:opacity-70 ${tagColors[result.indexOf(tag) % tagColors.length]}`;

            tags.appendChild(tagDisplay);
        });
    }

    // Time span
    const time = document.createElement("span");
    time.id = `cardTime-${cardCtn}`;
    time.classList = "font-bold flex gap-2";

    for (let i = 0; i < cardData.time; i++) {
        let timeBlockEl = document.createElement("div");
        timeBlockEl.classList.add("h-2");
        if (cardData.time % 1 === 0 || (i + 1) < cardData.time) {
            timeBlockEl.classList.add("w-2");
        } else {
            timeBlockEl.classList.add("w-1");
        }
        timeBlockEl.classList.add("my-2");
        timeBlockEl.classList.add("bg-violet-700");
        time.appendChild(timeBlockEl);
    }

    const timeLabelEl = document.createElement("h8");
    timeLabelEl.innerText = `(${cardData.time * 15}m)`;
    time.appendChild(timeLabelEl);

    infoContainer.appendChild(tags);
    infoContainer.appendChild(time);

    // Tags container
    const tagsContainer = document.createElement("div");
    tagsContainer.id = `cardTags-${cardCtn}`;
    tagsContainer.className = "flex gap-2 mt-3 flex-wrap";

    // Assemble the card
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(infoContainer);
    card.appendChild(tagsContainer);

    return card;
}



// Event listeners

addNewTagBtn.addEventListener("click", () => {
    const tagName = newTagInput.value.trim();

    if (!tagName) return;

    const newTag = {
        id: crypto.randomUUID(),
        name: tagName,
    };
    const store = getStore("tags");

    const request = store.add(newTag);
    selectedTags.push(newTag.id);

    request.onsuccess = () => {
        newTagInput.value = "";
        loadBoardData().then(() => {
            renderTagButtons();
        });
    };

    request.onerror = () => {
        const bgcolor = "bg-red-200";
        newTagInput.classList.add(bgcolor);
        setTimeout(() => {
            newTagInput.classList.remove(bgcolor);
        }, 500);
    };
});

addCardForm.addEventListener("submit", (event) => {
    event.preventDefault();
});

addCardSubmitBtn.addEventListener("click", (event) => {
    event.preventDefault();

    const newCard = {
        id: crypto.randomUUID(),
        columnId: addCardForm.dataset.columnId,
        title: addCardForm.title.value,
        description: addCardForm.description.value,
        time: Number(addCardForm.timeSlots.value),
        tagIds: selectedTags,
    };
    const store = getStore("cards");

    store.add(newCard);

    addCardForm.reset();

    renderBoard();
    closeModal(addCardModal);
});

closeAddCardModalBtn.addEventListener("click", () => {
    closeModal(addCardModal);
});

addColForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const newCategory = {
        id: crypto.randomUUID(),
        title: addColForm.title.value,
    }
    const store = getStore("columns");
    const request = store.add(newCategory);

    request.onsuccess = () => {
        renderBoard();
        closeModal(addColModal);
    }
});

closeAddColModalBtn.addEventListener("click", () => {
    console.log(addColModal);
    closeModal(addColModal);
});

trashEl.addEventListener("mouseenter", () => {
    trashEl.src = "./assets/bin-open.png";
});

trashEl.addEventListener("mouseleave", () => {
    trashEl.src = "./assets/bin-closed.png";
});