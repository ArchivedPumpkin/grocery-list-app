import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, connectDatabaseEmulator, ref, get, set, push, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
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

const usernameEl = document.getElementById("username");
const handleEl = document.getElementById("handle");
const friendsList = document.getElementById("friends-list");
const logoutBtn = document.getElementById("logout-btn");

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "/pages/auth.html";
        return;
    }

    console.log("User is authenticated:", user.uid);

    logoutBtn.addEventListener("click", async () => {
        console.log("Logging out...");
        try {
            await auth.signOut();
            console.log("User signed out successfully");
            window.location.href = "/pages/auth.html"; // Redirect to the auth page
        } catch (error) {
            console.error("Error signing out:", error);
        }
    })

    // Fetch and display user profile information
    async function displayUserProfile() {
        const userRef = ref(db, `users/${user.uid}`)
        const userSnapshot = await get(userRef);

        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            console.log("User data:", userData);

            usernameEl.textContent = userData.username;
            handleEl.textContent = `#${user.uid.slice(0, 5)}`; // Display first 5 characters of username id as handle

            // Display shared lists if any
            const sharedListsRef = ref(db, `groceryLists/lists`)
            const sharedListsSnapshot = await get(sharedListsRef);

            if (sharedListsSnapshot.exists()) {
                const sharedLists = sharedListsSnapshot.val();
                console.log("Shared lists:", sharedLists);

                for (let sharedId in sharedLists) {
                    const listData = sharedLists[sharedId];

                    const membersList = Object.values(listData.members).map(member => member.username).join(', ');
                    console.log("Members in shared list:", membersList);

                    const listItem = document.createElement("li");
                    listItem.innerHTML = `
                    <div class="list-item">
                        <div class="list-details">
                            <p id="list-name">${listData.name}</p>
                            <p id="list-members">${membersList}</p>
                        </div>
                        <a href="/pages/list.html?list=${sharedId}" class="view-list-btn">
                        <i class="fa-solid fa-angle-right view-list" id="view-list-btn" aria-hidden="true"></i>
                        </a>
                    </div>`;
                    friendsList.appendChild(listItem);

                }
            }



        }
    }

    displayUserProfile()
})