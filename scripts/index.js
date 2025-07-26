import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, get, push, onValue, remove, child, set, connectDatabaseEmulator, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getAuth, onAuthStateChanged, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

import { firebaseConfig } from "../config.js";

const app = initializeApp(firebaseConfig);
let auth;
let db;

if (location.hostname === "localhost") {
  console.log("Connecting to Firebase Emulators");
  auth = getAuth(app);
  connectAuthEmulator(auth, "http://localhost:9099");
  db = getDatabase(app);
  connectDatabaseEmulator(db, "localhost", 9000);
} else {
  auth = getAuth(app);
  db = getDatabase(app);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    const userId = user.uid;
    const referenceInDb = ref(getDatabase(app), `users/${userId}/groceryLists/default`);
    setupGroceriesApp(referenceInDb, user);
  } else {
    window.location.href = "/pages/auth.html";
  }
});


function setupGroceriesApp(referenceInDb, user) {

  let activeListRef = referenceInDb;

  const database = getDatabase(app);

  console.log(app);

  const inputEl = document.getElementById("input-el");
  const descriptionEl = document.getElementById("input-desc");
  const inputBtn = document.getElementById("input-btn");
  const ulEl = document.getElementById("ul-el");
  const deleteBtn = document.getElementById("delete-btn");
  const listSelect = document.getElementById("grocery-list-select");

  inputEl.addEventListener("input", function (event) {
    if (event.target.value.trim() !== "") {
      descriptionEl.disabled = false;
    }
    else {
      descriptionEl.disabled = true;
    }

  });

  function render(groceries) {

    if (!groceries) {
      let skeletonItems = "";
      for (let i = 0; i < 3; i++) {
        skeletonItems += `
         <li class="skeleton-item">
                    <div class="skeleton-container">
                        <div class="list__item_checkbox">
                            <div class="skeleton-checkbox"></div>
                            <div class="skeleton-content">
                                <div class="skeleton-title"></div>
                                <div class="skeleton-description"></div>
                            </div>
                        </div>
                        <div class="skeleton-drag"></div>
                    </div>
                </li>
        `;
      }
      ulEl.innerHTML = skeletonItems;
      return;
    }

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
          const itemRef = child(activeListRef, itemIdToDelete);

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
    const itemRef = child(activeListRef, itemId);

    update(itemRef, { completed: newCompleted });
  });

  deleteBtn.addEventListener("click", function () {
    remove(activeListRef);
    ulEl.innerHTML = "";
  });

  let groceriesList = [];

  function listenToList(refToListen) {

    render(null); // Show skeleton loading state first

    onValue(refToListen, (snapshot) => {
      if (snapshot.exists()) {
        const snapshotValues = snapshot.val();
        const groceries = Object.entries(snapshotValues).sort((a, b) => {
          return b[1].order - a[1].order;
        });

        groceriesList = groceries;
        render(groceries);
        setupSortable();
        setupSwipeWithHammer();
        setupEllipsisRevealDelete();
      } else {
        groceriesList = [];
        render([]);
        console.log("No groceries found in the database.");
      }
    });
  }


  listenToList(activeListRef);

  inputBtn.addEventListener("click", function () {
    let orderNum = groceriesList.length > 0 ? Math.max(...groceriesList.map(item => item[1].order)) + 1 : 1;
    if (inputEl.value.trim() === "") {
      alert("Please enter a grocery item.");
      return;
    } else if (groceriesList.some(item => item[1].name.toLowerCase() === inputEl.value.trim().toLowerCase())) {
      alert("This grocery item already exists.");
      return;
    } else {
      console.log("Trying to push:", {
        order: orderNum,
        name: inputEl.value,
        description: descriptionEl.value,
        completed: false
      });

      push(activeListRef, {
        name: inputEl.value,
        description: descriptionEl.value,
        completed: false,
        order: orderNum
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
      delay: 20,               // Delay to start dragging
      delayOnTouchOnly: true,   // Only delay on touch devices
      handle: ".drag-handle", // Handle for dragging
      onEnd: updateOrderInFirebase
    });

  }

  function updateOrderInFirebase() {
    const items = ulEl.querySelectorAll("li");

    items.forEach((li, index) => {
      const id = li.getAttribute("data-id");
      const itemRef = child(activeListRef, id);
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

  async function loadUserLists(userId) {
    const listSelect = document.getElementById("grocery-list-select");
    const newListBtn = document.getElementById("new-list-btn");

    listSelect.innerHTML = ""; // Clear old options before reloading

    const personalOption = document.createElement("option");
    personalOption.value = "personal";
    personalOption.textContent = "Personal list";
    listSelect.appendChild(personalOption);

    // Add user created lists

    const listsRef = ref(db, `users/${userId}/groceryLists/lists`);

    onValue(listsRef, (snapshot) => {
      const lists = snapshot.val();

      if (lists) {
        Object.entries(lists).forEach(([listId, list]) => {
          const option = document.createElement("option");
          option.value = listId;
          option.textContent = list.name;
          listSelect.appendChild(option);
        });
      }
    })

    // Add shared lists option
    const sharedRef = ref(db, `users/${userId}/groceryLists/sharedLists`);

    const maxCharacters = 8; // Maximum characters for the option text

    onValue(sharedRef, (snapshot) => {
      const sharedLists = snapshot.val();
      if (sharedLists) {
        Object.entries(sharedLists).forEach(([sharedId, value]) => {
          if (value && value.ownerUsername) {
            const option = document.createElement("option");
            option.value = sharedId;
            option.textContent = `${value.listName}`;
            listSelect.appendChild(option);
          }
        });
      }
      listSelect.classList.remove("loading"); // Remove loading class
      listSelect.disabled = false; // Enable the select after loading

    });

    newListBtn.addEventListener("click", async () => {
      const listName = prompt("Enter list name:");

      if (listName) {
        const newListRef = push(ref(db, `groceryLists/lists`));
        const listId = newListRef.key;

        const userRef = ref(db, `users/${userId}/username`);
        const userSnapshot = await get(userRef);
        const ownerUsername = userSnapshot.val() || user.displayName || "Unknown";

        try {

          await set(newListRef, {
            name: listName,
            createdBy: userId,
            createdAt: new Date(Date.now()).toLocaleDateString(),
            members: {
              [userId]: {
                username: ownerUsername,
                isOwner: true
              }
            },
            items: {}
          });

          await set(ref(db, `users/${userId}/groceryLists/lists/${listId}`), {
            name: listName,
            owner: true,
            username: ownerUsername
          });

          console.log("New list created:", listId);

        } catch (err) {

          console.error("Error creating new list:", err);
          alert("Failed to create new list. Please try again.");

        }
      }

    });

    listSelect.addEventListener("change", () => {
      const selectedValue = listSelect.value;

      if (selectedValue === "personal") {
        activeListRef = ref(db, `users/${userId}/groceryLists/default`);
      } else {
        activeListRef = ref(db, `groceryLists/lists/${selectedValue}/items`);
      }

      ulEl.innerHTML = ""; // Clear the current list
      listenToList(activeListRef);
      console.log("Active list changed to:", activeListRef);
    });
  }

  loadUserLists(user.uid);

}


