import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider, } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app-check.js";
import { getDatabase, ref, push, onValue, remove, connectDatabaseEmulator, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

import { firebaseConfig, APP_CHECK_RECAPTCHA_SITE_KEY } from "./config.js";

const app = initializeApp(firebaseConfig);

// Initialize Firebase App Check with reCAPTCHA v3
// Enable App Check only in production
if (location.hostname !== "localhost") {
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

  document.querySelectorAll('.list-item-enter').forEach((el) => {
    el.classList.remove('list-item-enter');
  });

  let listItems = "";
  for (let i = 0; i < groceries.length; i++) {

    const key = groceries[i][0];
    const value = groceries[i][1];
    const isCompleted = value.completed === true;
    const completedClass = isCompleted ? "checked" : "hide";
    const incompletedClass = isCompleted ? "hide" : "checked";
    const currentIds = Array.from(ulEl.querySelectorAll("li")).map(li => li.getAttribute("data-id"));
    const animationClass = currentIds.includes(key) ? "" : "list-item-enter";

    listItems += `
            <li class="${animationClass}" data-id="${key}" data-completed="${isCompleted}" draggable="true">
            <div class="swipe-wrapper">
            <div class="swipe-content">
            <div class="list__container">
            <div class="list__item_checkbox">
            <span class="list__item-icon empty-check ${incompletedClass}"></span>
            <span class="list__item-icon fa fa-check fa-2xs ${completedClass}"></span>
            <div class="item-details">
            <span class="item-name">${value.name}</span>
            ${value.description ? `<span class="item-description">${value.description}</span>` : ""}
            </div>
            </div>
            <i class="fa-solid fa-ellipsis drag-handle"></i>
            </div>
            </div>
            <button class="delete-btn-items fa fa-trash" title="Delete item" data-delete-id="${key}"></button>
            </div>
            </li>
        `;
  }
  ulEl.innerHTML = listItems;

  document.querySelectorAll('list-item-enter').forEach((el) => {
    el.addEventListener('animationend', () => {
      el.classList.remove('list-item-enter');
    }, { once: true });
  });
}

ulEl.addEventListener("click", function (event) {

  if (event.target.classList.contains("delete-btn-items")) {
    const itemIdToDelete = event.target.getAttribute("data-delete-id");
    const li = ulEl.querySelector(`li[data-id="${itemIdToDelete}"]`);
    if (li) {
      li.classList.add("list-item-exit");
      li.addEventListener("animationend", () => {
        const itemRef = ref(database, `groceries/${itemIdToDelete}`);
        remove(itemRef);
      }, { once: true });
    }
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

deleteBtn.addEventListener("click", function () {
  remove(referenceInDb);
  ulEl.innerHTML = "";
});

let groceriesList = [];

onValue(referenceInDb, function (snapshot) {
  const snapshotExists = snapshot.exists();

  if (snapshotExists) {
    const snapshotValues = snapshot.val();
    const groceries = Object.entries(snapshotValues).sort((a, b) => {
      return b[1].order - a[1].order;
    });


    groceriesList = groceries;
    console.log(groceries);
    render(groceries);
    setupSortable();
    setupSwipeWithHammer();
    setupEllipsisRevealDelete();
  } else {
    render([]);
    console.log("No groceries found in the database.");
  }
});

inputBtn.addEventListener("click", function () {
  let orderNum = groceriesList.length > 0 ? Math.max(...groceriesList.map(item => item[1].order)) + 1 : 1;
  if (inputEl.value.trim() === "") {
    alert("Please enter a grocery item.");
    return;
  } else if (groceriesList.some(item => item[1].name.toLowerCase() === inputEl.value.trim().toLowerCase())) {
    alert("This grocery item already exists.");
    return;
  } else {
    push(referenceInDb, {
      order: orderNum,
      name: inputEl.value,
      description: descriptionEl.value,
      completed: false,
    });
    inputEl.value = "";
    descriptionEl.value = "";
    descriptionEl.disabled = true;
  }

});

function setupSortable() {
  new Sortable(ulEl, {
    animation: 200,
    ghostClass: "sortable-ghost",    // ghost item while dragging
    chosenClass: "sortable-chosen",  // item being moved
    dragClass: "sortable-drag",      // optional: style during drag
    delay: 50,               // Delay to start dragging
    delayOnTouchOnly: true,   // Only delay on touch devices
    handle: ".drag-handle", // Handle for dragging
    onEnd: updateOrderInFirebase
  });

}

function updateOrderInFirebase() {
  const items = ulEl.querySelectorAll("li");

  items.forEach((li, index) => {
    const id = li.getAttribute("data-id");
    const itemRef = ref(database, `groceries/${id}`);
    update(itemRef, { order: index + 1 });
  });
}

function setupSwipeWithHammer() {
  const swipeItems = document.querySelectorAll('.swipe-wrapper');

  swipeItems.forEach(wrapper => {
    const hammer = new Hammer(wrapper);

    hammer.on('swipeleft', () => {
      // Close others
      document.querySelectorAll('.swipe-wrapper.swiped').forEach(el => {
        if (el !== wrapper) el.classList.remove('swiped');
      });
      wrapper.classList.add('swiped');
    });

    hammer.on('swiperight', () => {
      wrapper.classList.remove('swiped');
    });
  });

  document.addEventListener('touchstart', (e) => {
    const isSwipe = e.target.closest('.swipe-wrapper');
    if (!isSwipe) {
      document.querySelectorAll('.swipe-wrapper.swiped')
        .forEach(el => el.classList.remove('swiped'));
    }
  });

}

function setupEllipsisRevealDelete() {
  ulEl.querySelectorAll('.drag-handle').forEach(handle => {

    handle.addEventListener('click', (e) => {
      const swipeWrapper = handle.closest('.swipe-wrapper');
      if (!swipeWrapper) return;

      // If already swiped, toggle off
      if (swipeWrapper.classList.contains('swiped')) {
        swipeWrapper.classList.remove('swiped');
      } else {
        // Close all other swiped elements
        document.querySelectorAll('.swipe-wrapper.swiped').forEach(el => {
          if (el !== swipeWrapper) el.classList.remove('swiped');
        });
        swipeWrapper.classList.add('swiped');
      }
      e.stopPropagation();
    });
  });
}




