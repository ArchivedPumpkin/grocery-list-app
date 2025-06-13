import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider, } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app-check.js";
import { getDatabase, ref, push, onValue, remove, connectDatabaseEmulator, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

import { firebaseConfig, APP_CHECK_RECAPTCHA_SITE_KEY } from "./config.js";

const app = initializeApp(firebaseConfig);

// Initialize Firebase App Check with reCAPTCHA v3
// Enable App Check only in production
if (location.hostname !== "localhost" || location.hostname !== "grocery-list-app-ab9db--pr4-next-lj6b5bbg") {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(APP_CHECK_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true, // Set to true to enable automatic token refresh
  });
} else {
  console.log("App Check is disabled in development mode");
}

const database = getDatabase(app);

// If running locally, you can use the following line to enable emulator support
if (location.hostname === "localhost") {
  connectDatabaseEmulator(database, "localhost", 9000);
  console.log("Connected to Firebase Database Emulator");
}

const referenceInDb = ref(database, "groceries");

console.log(app);

const inputEl = document.getElementById("input-el");
const descriptionEl = document.getElementById("input-desc");
const inputBtn = document.getElementById("input-btn");
const ulEl = document.getElementById("ul-el");
const deleteBtn = document.getElementById("delete-btn");

inputEl.addEventListener("input", function (event) {
  if (event.target.value.trim() !== "") {
    descriptionEl.disabled = false;
  }
  else {
    descriptionEl.disabled = true;
  }

});

function render(groceries) {
  let listItems = "";
  for (let i = 0; i < groceries.length; i++) {

    const key = groceries[i][0];
    const value = groceries[i][1];
    const isCompleted = value.completed === true;
    const completedClass = isCompleted ? "checked" : "hide";
    const incompletedClass = isCompleted ? "hide" : "checked";

    listItems += `
            <li data-id="${key}" data-completed="${isCompleted}">
            <div class="list__container">
            <div class="list__item_checkbox">
            <span class="list__item-icon empty-check ${incompletedClass}"></span>
            <span class="list__item-icon fa fa-check fa-2xs ${completedClass}"></span>
            <span class="item-name">${value.name}</span>
            </div>
            <button class="delete-btn fa fa-times" title="Delete item" data-delete-id="${key}"></button>
            </div>
            ${value.description ? `<span class="item-description">${value.description}</span>` : ""}
            </li>
        `;
  }
  ulEl.innerHTML = listItems;
}

ulEl.addEventListener("click", function (event) {

  if (event.target.classList.contains("delete-btn")) {
    const itemIdToDelete = event.target.getAttribute("data-delete-id");
    const itemRef = ref(database, `groceries/${itemIdToDelete}`);
    remove(itemRef);
    console.log("Delete button clicked for item ID:", itemIdToDelete);
    return;
  }

  const li = event.target.closest("li");
  if (!li) return;
  console.log("List item clicked:", li);

  const itemId = li.getAttribute("data-id");
  const currentCompleted = li.getAttribute("data-completed") === "true";
  const newCompleted = !currentCompleted;
  const incompletedIcon = li.querySelector(".empty-check");
  const completedIcon = li.querySelector(".fa-check");

  if (newCompleted) {
    incompletedIcon.classList.add("hide");
    completedIcon.classList.remove("checked");
  } else {
    incompletedIcon.classList.remove("hide");
    completedIcon.classList.add("checked");
  }

  li.setAttribute("data-completed", newCompleted);
  const itemRef = ref(database, `groceries/${itemId}`);
  update(itemRef, { completed: newCompleted });
});

deleteBtn.addEventListener("dblclick", function () {
  remove(referenceInDb);
  ulEl.innerHTML = "";
});

onValue(referenceInDb, function (snapshot) {
  const snapshotExists = snapshot.exists();

  if (snapshotExists) {
    const snapshotValues = snapshot.val();
    const groceries = Object.entries(snapshotValues);
    console.log(groceries);
    render(groceries);
  } else {
    render([]);
    console.log("No groceries found in the database.");
  }
});

inputBtn.addEventListener("click", function () {
  if (inputEl.value.trim() === "") {
    alert("Please enter a grocery item.");
    return;
  } else {
    push(referenceInDb, {
      name: inputEl.value,
      description: descriptionEl.value,
      completed: false,
    });
    inputEl.value = "";
    descriptionEl.value = "";
    descriptionEl.disabled = true;
  }

});
