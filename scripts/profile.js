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
            usernameEl.textContent = userData.username;
            // Display first 5 characters of username id as handle
            handleEl.textContent = `#${user.uid.slice(0, 5)}`;


        }
    }

    displayUserProfile()
})