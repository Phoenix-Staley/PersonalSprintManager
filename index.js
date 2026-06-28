// INITIALIZATION

const DB_NAME = "sprint_manager";
const DB_VERSION = 1;

let db;
let cardCtn = 0;
let columnsTab;
let cardsTab;
let tagsTab;
let selectedTags = [];
let tagColors = ["bg-red-200", "bg-green-200", "bg-blue-200", "bg-yellow-100", "bg-purple-200", "bg-pink-200"];
let selectedTagColors = ["bg-red-300", "bg-green-300", "bg-blue-300", "bg-yellow-200", "bg-purple-300", "bg-pink-300"];

const columnContainer = document.getElementById("columnContainer");

const addCardModal = document.getElementById("addCardModal");
const closeAddCardModalBtn = document.getElementById("closeAddCardModalBtn");
const addCardForm = document.getElementById("addCardForm");
const addCardSubmitBtn = document.getElementById("createCardBtn");

const addColModal = document.getElementById("addColModal");
const closeAddColModalBtn = document.getElementById("closeAddColModalBtn");
const addColForm = document.getElementById("addColForm");

const existingTagsContainer = document.getElementById("existingTagsContainer");
const newTagInput = document.getElementById("newTagInput");
const addNewTagBtn = document.getElementById("addNewTagBtn");

const confirmModal = document.getElementById("confirmModal");
const closeConfirmModalBtn = document.getElementById("closeConfirmModalBtn");
const yesConfirmBtn = document.getElementById("yesConfirmBtn");
const noConfirmBtn = document.getElementById("noConfirmBtn");

const trashEl = document.getElementById("trashcan");

let draggedElement = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

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

    const tagsStore = db.createObjectStore("tags", {
        keyPath: "id"
    });

    tagsStore.createIndex("tagId", "tagId", { unique: true });
    tagsStore.createIndex("name", "name", { unique: true });

    seedDefaultColumns(columnsStore, cardsStore, tagsStore);
}







// ACTIVE LOGIC










// HELPER FUNCTIONS

function seedDefaultColumns(columnsStore, cardsStore, tagsStore) {
    // starter columns
    columnsStore.add({
        id: "todo",
        title: "To Do",
        order: 1,
    });

    columnsStore.add({
        id: "inProgress",
        title: "In Progress",
        order: 2,
    });

    columnsStore.add({
        id: "done",
        title: "Done",
        order: 3,
    });

    // starter card
    const washDishesCardId = crypto.randomUUID();

    cardsStore.add({
        id: washDishesCardId,
        columnId: "done",
        title: "Wash Dishes",
        description: "Put them in the dishwasher",
        time: 4,
        order: 1,
    });

    // starter tags
    tagsStore.add({
        id: crypto.randomUUID(),
        cardId: washDishesCardId,
        tagId: "chores",
        name: "Chores",
    });

    tagsStore.add({
        id: crypto.randomUUID(),
        cardId: washDishesCardId,
        tagId: "hygiene",
        name: "Hygiene",
    });

    tagsStore.add({
        id: crypto.randomUUID(),
        cardId: washDishesCardId,
        tagId: "home",
        name: "Home",
    });
}

function getStore(storeName, mode = "readwrite") {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}

function getAllFromStore(storeName) {
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
    else if (trashTarget) {
        openModal(confirmModal);

        closeConfirmModalBtn.addEventListener("click", () => {
            closeModal(confirmModal);
        });

        noConfirmBtn.addEventListener("click", () => {
            closeModal(confirmModal);
        });

        yesConfirmBtn.addEventListener("click", () => {
            const cardStore = getStore("cards");
            const request = cardStore.delete(cardData.id);

            request.onsuccess = () => {
                closeModal(confirmModal);
                renderBoard();
            }

            request.onerror = () => {
                console.error("Unable to delete card:", error);
            }
        });
    }
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
            : `border-2 rounded px-2 py-1 m-1 cursor-pointer focus:opacity-70 ${tagColors[tagsTab.indexOf(tag) % tagColors.length]}`;

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

function openModal(modal, form) {
    form.reset();
    renderTagButtons();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function openModal(modal, form) {
    renderTagButtons();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeModal(modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

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

    const addCardBtn = document.createElement("button");
    addCardBtn.id = "addColBtn";
    addCardBtn.className = "h-32 my-16 bg-sky-200 border-3 border-black rounded-2xl cursor-pointer flex items-center justify-center flex-none";
    addCardBtn.innerHTML = `<h2 id="addColBtn" class="font-bold text-8xl p-8">+</h2>`;

    columnContainer.appendChild(addCardBtn);
}

function createColumnElement(column) {
    // Column container
    const columnDiv = document.createElement("div");
    columnDiv.id = `column-${column.id}`;
    columnDiv.className = "bg-gray-200 rounded-xl p-4 flex-1 flex flex-col flex-auto gap-4";

    // Column header
    const headerCont = document.createElement("div");
    headerCont.id = `columnHeader-${column.id}`;
    headerCont.className = "relative bg-sky-200 rounded-xl border-3 border-black p-4";

    const header = document.createElement("h2");
    header.id = `columnTitle-${column.id}`;
    header.className = "text-xl font-bold text-center";
    header.textContent = column.title;

    const addCardBtn = document.createElement("button");
    addCardBtn.id = `addCardBtn-${column.id}`;
    addCardBtn.className = "absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-sky-300 border-3 border-black rounded-xl cursor-pointer flex items-center justify-center";
    addCardBtn.innerHTML = `<h2 class="font-bold text-3xl">+</h2>`;

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
    card.className = "bg-white rounded-lg border-2 border-gray-300 shadow-sm p-4 text-left flex flex-col gap-2 cursor-grab";

    // Title
    const title = document.createElement("h3");
    title.id = `cardTitle-${cardCtn}`;
    title.className = "text-lg font-semibold";
    title.textContent = cardData.title;

    // Description
    const description = document.createElement("p");
    description.id = `cardDescription-${cardCtn}`;
    description.className = "text-gray-600 text-sm mt-2";
    description.textContent = cardData.description;

    // Priority / Time container
    const infoContainer = document.createElement("div");
    infoContainer.id = `cardInfo-${cardCtn}`;
    infoContainer.className = "flex justify-between mt-4 text-sm";

    // Priority span
    const priority = document.createElement("span");
    priority.id = `cardPriority-${cardCtn}`;

    // Time span
    const time = document.createElement("span");
    time.id = `cardTime-${cardCtn}`;
    time.classList.add("flex");
    time.classList.add("gap-2");

    const timeLabelEl = document.createElement("h8");
    timeLabelEl.innerText = "Time (15m blocks):"
    time.appendChild(timeLabelEl);

    for (let i = 0; i < cardData.time; i++) {
        let timeBlockEl = document.createElement("div");
        timeBlockEl.classList.add("h-2");
        timeBlockEl.classList.add("w-2");
        timeBlockEl.classList.add("my-2");
        timeBlockEl.classList.add("bg-violet-700");
        time.appendChild(timeBlockEl);
    }

    infoContainer.appendChild(priority);
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

    renderBoard();
    closeModal(addCardModal);
});

closeAddCardModalBtn.addEventListener("click", () => {
    closeModal(addCardModal);
});

addColForm.addEventListener("click", (event) => {
    event.preventDefault();

    const newCategory = {
        ID: crypto.randomUUID(),
        title: addColForm.title.value,
    }

    columnsTab.add(newCategory);

    renderBoard();
    closeModal(addColModal);
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