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

const serachInput = document.getElementById("input-el");
const searchBtn = document.getElementById("input-btn");
const friendsList = document.getElementById("friends-list");

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "/pages/auth.html";
        return;
    }

    console.log("User is authenticated:", user.uid);

    // Display 5 users by default
    displayUsers();

    searchBtn.addEventListener("click", async () => {
        const searchTerm = serachInput.value.trim().toLowerCase();
        if (!searchTerm) {
            alert("Please enter a search term.");
            return;
        }

        console.log("Searching for friends with term:", searchTerm);
        await displayUsers(searchTerm);
    });

    async function addFriend(addBtn, userId, username) {
        const currentUserId = user.uid;
        const sharedId = [currentUserId, userId].sort().join("_");

        try {
            // ✅ Fetch current user's username from DB
            const currentUserSnapshot = await get(ref(db, `users/${currentUserId}/username`));
            const currentUsername = currentUserSnapshot.exists() ? currentUserSnapshot.val() : "(Unknown)";

            // ✅ Create shared list
            const sharedRef = ref(db, `groceryLists/sharedLists/${sharedId}`);
            await set(sharedRef, {
                createdBy: currentUserId,
                members: {
                    [currentUserId]: true,
                    [userId]: true
                },
                name: `Shared with ${username}`,
                items: {}
            });

            // ✅ Add reference to both users
            await set(ref(db, `users/${currentUserId}/groceryLists/sharedLists/${sharedId}`), {
                friendId: userId,
                friendUsername: username,
                listId: sharedId
            });

            await set(ref(db, `users/${userId}/groceryLists/sharedLists/${sharedId}`), {
                friendId: currentUserId,
                friendUsername: currentUsername, // ✅ using value from database
                listId: sharedId
            });

            alert("Friend and shared list added successfully");
            displayUsers(); // Refresh the list
        } catch (err) {
            console.error("Failed to add friend or create shared list:", err);
            alert("Something went wrong. Please try again.");
        }
    };

    async function removeFriend(userId, username) {
        const currentUserId = user.uid;
        const sharedId = [currentUserId, userId].sort().join("_");

        try {
            // Remove from current user's shared lists
            await set(ref(db, `users/${currentUserId}/groceryLists/sharedLists/${sharedId}`), null);

            // Remove both users from the shared list
            const sharedMembersRef = ref(db, `groceryLists/sharedLists/${sharedId}/members`);
            const sharedMembersSnapshot = await get(sharedMembersRef);
            const members = sharedMembersSnapshot.val() || {};

            const updates = {};
            updates[`groceryLists/sharedLists/${sharedId}/members/${currentUserId}`] = null;
            updates[`groceryLists/sharedLists/${sharedId}/members/${userId}`] = null;

            await update(ref(db), updates);

            alert(`Friend ${username} removed successfully`);
            displayUsers(); // Refresh the list
        } catch (err) {
            console.error("Failed to remove friend or shared list:", err);
            alert("Something went wrong. Please try again.");
        }
    }

    function setupAddRemoveButton(addBtn, isFriend, userId, username) {
        if (isFriend) {
            addBtn.textContent = "Remove";
            addBtn.classList.remove("add-btn");
            addBtn.classList.add("remove-btn");
            addBtn.addEventListener("click", () => removeFriend(userId, username));
        }
        else {
            addBtn.textContent = "Add";
            addBtn.classList.add("add-btn");
            addBtn.addEventListener("click", () => addFriend(addBtn, userId, username));
        }
        return addBtn;
    }

    async function displayUsers(searchTerm = "") {
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


