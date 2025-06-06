import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app-check.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

import { firebaseConfig, APP_CHECK_RECAPTCHA_SITE_KEY } from "./config.js";

const app = initializeApp(firebaseConfig);
// Initialize Firebase App Check with reCAPTCHA v3
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(APP_CHECK_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true, // Set to true to enable automatic token refresh
});

const database = getDatabase(app);
const referenceInDb = ref(database, "groceries");

console.log(app);

const inputEl = document.getElementById("input-el");
const inputBtn = document.getElementById("input-btn");
const ulEl = document.getElementById("ul-el");
const deleteBtn = document.getElementById("delete-btn");

function render(groceries) {
  let listItems = "";
  for (let i = 0; i < groceries.length; i++) {
    listItems += `
            <li>${groceries[i]}</li>
        `;
  }
  ulEl.innerHTML = listItems;
}

deleteBtn.addEventListener("dblclick", function () {
  remove(referenceInDb);
  ulEl.innerHTML = "";
});

onValue(referenceInDb, function (snapshot) {
  const snapshotExists = snapshot.exists();

  if (snapshotExists) {
    const snapshotValues = snapshot.val();
    const groceries = Object.values(snapshotValues);
    console.log(groceries);
    render(groceries);
  }
});

inputBtn.addEventListener("click", function () {
  push(referenceInDb, inputEl.value);
  inputEl.value = "";
});
