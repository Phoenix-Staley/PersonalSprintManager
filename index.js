const DB_NAME = "sprint_manager";
const DB_VERSION = 1;

let db;
let addColBtn = document.getElementById("addColBtn");

const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onerror = () => {
    console.error("Error opening database:", request.error);
}

request.onsuccess = () => {
    db = request.result;
    console.log("Database opened successfully");
    // loadTasks();
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

    tagsStore.createIndex("tagId", "tagId", { unique: false });

    seedDefaultColumns(columnsStore, cardsStore, tagsStore);
}

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
}

function createTestCard() {
    addCard({
        id: crypto.randomUUID(),
        columnId: "todo",
        title: "Implement Login Page",
        description: "Connect frontend authentication.",
        priority: "High",
        estimate: "2 hrs",
        order: 1,
    });
}

addColBtn.addEventListener("click", () => {
    createTestCard();
});