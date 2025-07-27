import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, connectDatabaseEmulator, ref, get, set, push, update, onValue, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
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

    async function sendListSharingRequest(listId, currentUserId, selectedUserId, selectedUsername) {
        try {
            const listRef = ref(db, `groceryLists/lists/${listId}`);
            const listSnapshot = await get(listRef);
            const listData = listSnapshot.val();

            if (!listData) {
                alert("Selected list does not exist.");
                return;
            }

            // Get current user's username
            const userSnapshot = await get(ref(db, `users/${currentUserId}`));
            const userData = userSnapshot.val();
            const fromUsername = userData.username || 'Unknown User';

            const requestRef = ref(db, `users/${selectedUserId}/pendingRequests/${listId}`);
            await set(requestRef, {
                listId: listId,
                listName: listData.name,
                fromUserId: currentUserId,
                fromUsername: fromUsername,
                timestamp: new Date(Date.now()).toLocaleDateString(),
                status: 'pending'
            });

            alert(`Sharing request sent to ${selectedUsername}`);
            document.querySelector(".list-select-container").classList.add("hide");

        } catch (err) {
            console.error("Error sending share request:", err);
            alert("Failed to send sharing request. Please try again.");
        }
    }

    async function handleListSharingAccept(listId, selectedUserId, selectedUsername) {
        console.log('Starting list sharing acceptance process...', {
            listId,
            selectedUserId,
            selectedUsername
        });

        try {
            const listRef = ref(db, `groceryLists/lists/${listId}`);
            console.log('Fetching list data...');
            const listSnapshot = await get(listRef);
            const listData = listSnapshot.val();
            console.log('List data retrieved:', listData);

            const existingMembers = listData.members || {};
            const updateMembers = {
                ...existingMembers,
                [selectedUserId]: {
                    username: selectedUsername
                }
            }
            console.log('Updated members structure:', updateMembers);

            console.log('Updating main list with new member...');
            await update(listRef, {
                members: updateMembers
            });

            console.log('Adding list to user\'s shared lists...');
            const sharedListRef = ref(db, `users/${selectedUserId}/groceryLists/sharedLists/${listId}`);
            await set(sharedListRef, {
                members: updateMembers,
                listName: listData.name,
                items: listData.items || {},
                shared: true
            });

            console.log('Removing pending request...');
            const requestRef = ref(db, `users/${selectedUserId}/pendingRequests/${listId}`);
            await remove(requestRef);

            console.log('List sharing acceptance completed successfully');
            return true;

        } catch (err) {
            console.error('Error in handleListSharingAccept:', err);
            console.error('Error details:', {
                message: err.message,
                code: err.code,
                stack: err.stack
            });
            return false;
        }
    }

    function createNotificationElement(request, listId) {
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item';
        notificationItem.dataset.listId = listId;

        const message = document.createElement('div');
        message.className = 'notification-message';
        message.textContent = `${request.fromUsername} wants to share "${request.listName}" with you`;

        const actions = document.createElement('div');
        actions.className = 'notification-actions';

        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'accept-btn';
        acceptBtn.textContent = 'Accept';

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'reject-btn';
        rejectBtn.textContent = 'Reject';

        actions.appendChild(acceptBtn);
        actions.appendChild(rejectBtn);
        notificationItem.appendChild(message);
        notificationItem.appendChild(actions);

        return notificationItem;
    }

    function updateNotificationCount() {
        const count = document.querySelectorAll('.notification-item').length;
        const countElement = document.querySelector('.notification-count');
        countElement.textContent = count;

        // Show/hide the container based on count
        const container = document.querySelector('.notifications-container');
        container.style.display = count > 0 ? 'block' : 'none';
    }

    // Modify your setupPendingRequestsListener function
    function setupPendingRequestsListener(userId) {
        const pendingRequestsRef = ref(db, `users/${userId}/pendingRequests`);
        const notificationsList = document.querySelector('.notifications-list');

        onValue(pendingRequestsRef, async (snapshot) => {
            const requests = snapshot.val();

            const userSnapshot = await get(ref(db, `users/${userId}`));
            const userData = userSnapshot.val();
            const currentUsername = userData.username;

            notificationsList.innerHTML = ''; // Clear existing notifications

            if (requests) {
                Object.entries(requests).forEach(([listId, request]) => {
                    if (request.status === 'pending') {
                        const notificationElement = createNotificationElement(request, listId);

                        // Setup accept button
                        notificationElement.querySelector('.accept-btn').addEventListener('click', async () => {
                            console.log('Accept button clicked for list:', listId);
                            notificationElement.classList.add('loading');

                            console.log('Attempting to accept sharing request...');
                            const success = await handleListSharingAccept(
                                listId,
                                userId,
                                currentUsername
                            );

                            if (success) {
                                console.log('Successfully accepted sharing request for list:', listId);
                                notificationElement.remove();
                                updateNotificationCount();
                            } else {
                                console.error('Failed to accept sharing request for list:', listId);
                                notificationElement.classList.remove('loading');
                            }
                        });

                        // Setup reject button
                        notificationElement.querySelector('.reject-btn').addEventListener('click', async () => {
                            console.log('Reject button clicked for list:', listId);
                            notificationElement.classList.add('loading');

                            try {
                                console.log('Attempting to remove request from database...');
                                await remove(ref(db, `users/${userId}/pendingRequests/${listId}`));
                                console.log('Successfully removed request from database');
                                notificationElement.remove();
                                updateNotificationCount();
                            } catch (error) {
                                console.error('Error removing request:', error);
                                notificationElement.classList.remove('loading');
                            }
                        });

                        notificationsList.appendChild(notificationElement);
                    }
                });
            }

            updateNotificationCount();
        });
    }

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
                await sendListSharingRequest(listId, currentUserId, selectedUserId, selectedUsername);
            } catch (err) {
                console.error("Error sending sharing request:", err);
                alert("Failed to send sharing request. Please try again.");
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
    setupPendingRequestsListener(user.uid);
});


