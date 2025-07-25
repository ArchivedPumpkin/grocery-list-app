import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, connectDatabaseEmulator, ref, get, set, push, update, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
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
let selectedUserId = null;
let selectedUsername = null;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "/pages/auth.html";
        return;
    }

    console.log("User is authenticated:", user.uid);

    // Display 5 users by default
    displayUsers();

    // Share list with another user
    setupListSharing(user.uid);

    searchBtn.addEventListener("click", async () => {
        const searchTerm = serachInput.value.trim().toLowerCase();
        if (!searchTerm) {
            alert("Please enter a search term.");
            return;
        }

        console.log("Searching for friends with term:", searchTerm);
        await displayUsers(searchTerm);
    });

    function setupListSharing(currentUserId) {
        const listSelect = document.getElementById("list-to-share");
        const shareBtn = document.getElementById("share-btn");
        const listContainer = document.querySelector(".list-select-container");

        const listRef = ref(db, `users/${currentUserId}/groceryLists/lists`);

        onValue(listRef, (snapShot) => {
            const lists = snapShot.val();
            console.log("Available lists:", lists);
            listSelect.innerHTML = '<option value="" disabled selected>Select a list to share</option>';

            if (lists) {
                for (let listId in lists) {
                    const option = document.createElement("option");
                    option.value = listId;
                    option.textContent = lists[listId].name;
                    listSelect.appendChild(option);
                }
            } else {
                const option = document.createElement("option");
                option.value = "";
                option.textContent = "No lists available";
                listSelect.appendChild(option);
            };
        });

        shareBtn.addEventListener("click", async () => {
            if (!selectedUserId || !selectedUsername) return;

            const listId = listSelect.value;

            if (!listId) {
                alert("Please select a list to share.");
                return;
            }

            try {
                const listRef = ref(db, `groceryLists/lists/${listId}`);
                const listSnapshot = await get(listRef);
                const listData = listSnapshot.val();

                const ownerUsernameRef = await get(ref(db, `users/${currentUserId}/username`));
                const ownerUsername = ownerUsernameRef.val() ?? user.displayName ?? "Unknown";

                if (!listData) {
                    alert("Selected list does not exist.");
                    return;
                }

                await update(listRef, {
                    [`members/${selectedUserId}`]: true
                })

                const sharedListRef = ref(db, `users/${selectedUserId}/groceryLists/sharedLists/${listId}`);
                await set(sharedListRef, {
                    ownerId: user.uid,
                    ownerUsername: ownerUsername,
                    listName: listData.name
                })
                alert(`List "${listData.name}" shared with ${selectedUsername}.`);
                document.querySelector(".list-select-container").classList.add("hide");

            } catch (err) {
                console.error("Error sharing list:", err);
                alert("Failed to share the list. Please try again.");
            }
        })
    }

    function setupAddRemoveButton(addBtn, isFriend, userId, username) {
        addBtn.className = isFriend ? "remove-btn" : "add-btn";
        addBtn.textContent = isFriend ? "Remove" : "Share";

        addBtn.addEventListener("click", () => {
            if (!isFriend) {
                selectedUserId = userId;
                selectedUsername = username;

                document.querySelector(".list-select-container").classList.remove("hide");

            }
            else {
                removeFriend(userId, username);
            }
        })
    }

    async function displayUsers(searchTerm = "") {

        friendsList.innerHTML = ""; // Clear previous results

        for (let i = 0; i < 5; i++) {
            const skeletonItem = document.createElement("li");
            skeletonItem.className = "skeleton-item";
            skeletonItem.innerHTML = `

            <div class="skeleton-profile-pic"></div>
            <div class="skeleton-username"></div>
            <div class="skeleton-button"></div>

            `;
            friendsList.appendChild(skeletonItem);
        }


        const usersRef = ref(db, 'users');
        const snapShot = await get(usersRef);
        const users = snapShot.val();
        const sharedListRef = ref(db, `users/${user.uid}/groceryLists/sharedLists`);
        const sharedListSnapshot = await get(sharedListRef);
        const sharedLists = sharedListSnapshot.val() || {};

        console.log("Users in database:", users);

        friendsList.innerHTML = ""; // Clear previous results

        // Display 5 users by default if no search term is provided
        if (!users) {
            console.log("No users found in the database.");
            return;
        }

        if (!searchTerm) {
            let count = 0;
            for (let userId in users) {
                if (userId === user.uid) continue;
                const { username, profilePicture } = users[userId];
                if (username) {
                    const listItem = document.createElement("li");

                    // Create profile picture element
                    const profilePic = document.createElement("img");
                    profilePic.src = profilePicture || "/imgs/default-avatar.jpg"; // Default placeholder image
                    profilePic.alt = `${username}'s profile picture`;
                    profilePic.className = "profile-pic"; // Add a class for styling

                    // Create username element
                    const usernameElement = document.createElement("span");
                    usernameElement.textContent = username;

                    // Create add button
                    const addBtn = document.createElement("button");

                    const isFriend = sharedLists[[user.uid, userId].sort().join("_")];

                    setupAddRemoveButton(addBtn, isFriend, userId, username);


                    listItem.appendChild(profilePic);
                    listItem.appendChild(usernameElement);
                    listItem.appendChild(addBtn);
                    friendsList.appendChild(listItem);

                    count++;

                    if (count >= 5) break; // Limit to 5 users
                }
            }
        } else {
            // Search for users matching the search term
            for (let userId in users) {
                const { username, profilePicture } = users[userId];
                if (username && username.toLowerCase().includes(searchTerm) && userId !== user.uid) {
                    const listItem = document.createElement("li");

                    // Create profile picture element
                    const profilePic = document.createElement("img");
                    profilePic.src = profilePicture || "/imgs/default-avatar.jpg"; // Default placeholder image
                    profilePic.alt = `${username}'s profile picture`;
                    profilePic.className = "profile-pic"; // Add a class for styling

                    // Create username element
                    const usernameElement = document.createElement("span");
                    usernameElement.textContent = username;

                    //Create add button
                    const addBtn = document.createElement("button");

                    const isFriend = sharedLists[[user.uid, userId].sort().join("_")];
                    setupAddRemoveButton(addBtn, isFriend, userId, username);


                    listItem.appendChild(profilePic);
                    listItem.appendChild(usernameElement);
                    listItem.appendChild(addBtn);
                    friendsList.appendChild(listItem);
                }

            }
        }

    }

});


