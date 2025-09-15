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
const editBtn = document.getElementById("edit-list-btn");

friendsList.innerHTML = `
    <div class="loading-container">
        <div class="loader"></div>
    </div>`;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "/pages/auth.html";
        return;
    }

    console.log("User is authenticated:", user.uid);
    displayUserProfile();


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
        try {
            const userRef = ref(db, `users/${user.uid}`)
            const userSnapshot = await get(userRef);

            friendsList.innerHTML = ""; // Clear loading indicator

            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                console.log("User data:", userData);

                usernameEl.textContent = userData.username;
                handleEl.textContent = `#${user.uid.slice(0, 5)}`; // Display first 5 characters of username id as handle

                // Display shared lists if any
                const sharedListsRef = ref(db, `groceryLists/lists`)
                const sharedListsSnapshot = await get(sharedListsRef);
                let hasSharedLists = false;

                if (sharedListsSnapshot.exists()) {
                    const sharedLists = sharedListsSnapshot.val();
                    console.log("Shared lists:", sharedLists);

                    for (let sharedId in sharedLists) {
                        const listData = sharedLists[sharedId];
                        const listItem = document.createElement("li");

                        if (listData.members && listData.members[user.uid]) {
                            hasSharedLists = true;
                            const membersList = Object.values(listData.members).map(member => member.username).join(', ');
                            console.log("Members in shared list:", membersList);


                            listItem.innerHTML = `
                            <div class="list-item">
                            <a href="/pages/list.html?list=${sharedId}" class="view-list-btn">
                                <div class="list-details">
                                    <p id="list-name">${listData.name}</p>
                                    <p id="list-members">${membersList}</p>
                                </div>
                                
                                <i class="fa-solid fa-angle-right view-list" id="view-list-btn" aria-hidden="true"></i>
                                </a>
                                <i class="fa-solid fa-trash delete-list-btn" style="display: none;" aria-hidden="true"></i>
                            </div>`;
                            friendsList.appendChild(listItem);
                        }

                        const deleteBtn = listItem.querySelector(".delete-list-btn");
                        const viewBtn = listItem.querySelector(".view-list-btn");
                        const viewIcon = listItem.querySelector("#view-list-btn");
                        let isEditing = false;

                        editBtn.addEventListener("click", () => {
                            isEditing = !isEditing;
                            console.log("Toggling edit mode:", isEditing);
                            if (isEditing) {
                                viewBtn.style.pointerEvents = "none"; // Disable link
                                deleteBtn.style.display = "block";
                                viewIcon.style.display = "none";
                                editBtn.textContent = "Done";
                            } else {
                                viewBtn.style.pointerEvents = "auto"; // Enable link
                                deleteBtn.style.display = "none";
                                viewIcon.style.display = "block";
                                editBtn.textContent = "Edit";
                            }
                        })

                        deleteBtn.addEventListener("click", async () => {
                            try {
                                const listRef = ref(db, `groceryLists/lists/${sharedId}`);
                                const userListRef = ref(db, `users/${user.uid}/groceryLists/lists/${sharedId}`);
                                const sharedListRef = ref(db, `users/${user.uid}/groceryLists/sharedLists/${sharedId}`);
                                const listSnapshot = await get(listRef);
                                const userListSnapshot = await get(userListRef);
                                const sharedListSnapshot = await get(sharedListRef);

                                if (listSnapshot.exists()) {
                                    const listData = listSnapshot.val();
                                    const memberCount = listData.members ? Object.keys(listData.members).length : 0;
                                    console.log("Member count:", memberCount);

                                    if (memberCount <= 1) {
                                        await set(listRef, null);
                                        console.log("List deleted as user was the last member.");
                                    } else {
                                        const memberRef = ref(db, `groceryLists/lists/${sharedId}/members/${user.uid}`);
                                        await set(memberRef, null);
                                        console.log("User removed from shared list members.");
                                    }
                                    listItem.remove();
                                }

                                if (userListSnapshot.exists()) {
                                    await set(userListRef, null);
                                    console.log("List reference removed from user's profile.");
                                }

                                if (sharedListSnapshot.exists()) {
                                    await set(sharedListRef, null);
                                    console.log("Shared list reference removed from user's profile.");
                                }

                            } catch (error) {
                                console.error("Error removing user from shared list:", error);
                            }
                        })

                    }
                }

                if (!hasSharedLists) {
                    const listItem = document.createElement("li");
                    listItem.innerHTML = `
                <div class="list-item">
                    <p>You are not a member of any shared lists.</p>
                </div>`
                    friendsList.appendChild(listItem);
                }
            }
        } catch (error) {
            console.error("Error loading profile:", error);
            friendsList.innerHTML = `
            <div class="list-item">
                <p>Error loading lists. Please try again.</p>
            </div>`;
        }
    }
});