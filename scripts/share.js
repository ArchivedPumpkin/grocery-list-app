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
                addBtn.textContent = "Add";

                addBtn.addEventListener("click", async () => {
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

                        addBtn.disabled = true;
                        addBtn.textContent = "Added";
                        alert("Friend and shared list added successfully");
                    } catch (err) {
                        console.error("Failed to add friend or create shared list:", err);
                        alert("Something went wrong. Please try again.");
                    }
                });


                listItem.appendChild(profilePic);
                listItem.appendChild(usernameElement);
                listItem.appendChild(addBtn);
                friendsList.appendChild(listItem);
            }

        }


    })


})