import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, connectDatabaseEmulator, ref, get, set, push } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
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

const serachInput = document.getElementById("input-el");
const searchBtn = document.getElementById("input-btn");
const friendsList = document.getElementById("friends-list");

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "/pages/auth.html";
        return;
    }

    console.log("User is authenticated:", user.uid);

    searchBtn.addEventListener("click", async () => {
        const searchTerm = serachInput.value.trim().toLowerCase();
        if (!searchTerm) {
            alert("Please enter a search term.");
            return;
        }

        console.log("Searching for friends with term:", searchTerm);

        const usersRef = ref(db, 'users');
        const snapShot = await get(usersRef);
        const users = snapShot.val();
        console.log("Users in database:", users);

        friendsList.innerHTML = ""; // Clear previous results

        for (let userId in users) {
            const { username } = users[userId];
            if (username && username.toLowerCase().includes(searchTerm) && userId !== user.uid) {
                const listItem = document.createElement("li");
                listItem.textContent = username;

                const addBtn = document.createElement("button");
                addBtn.textContent = "Add";

                addBtn.addEventListener("click", async () => {
                    console.log("Adding friend:", userId);

                    const currentUserId = user.uid;
                    const friendsRef = ref(db, `users/${currentUserId}/friends/${userId}`);

                    try {
                        await set(friendsRef, { username: username })

                        console.log("Friend added successfully");
                        alert("Friend added successfully");

                        addBtn.disabled = true; // Disable the button after adding
                        addBtn.textContent = "Added"; // Change button text
                    } catch (err) {
                        console.error("Error adding friend:", err);
                        alert("Failed to add friend. Please try again.");
                    }
                })

                listItem.appendChild(addBtn);
                friendsList.appendChild(listItem);
            }

        }


    })


})