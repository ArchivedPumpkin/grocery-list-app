import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { firebaseConfig } from "../config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let db;

if (location.hostname === "localhost") {
    db = getDatabase(app);
    connectDatabaseEmulator(db, "localhost", 9000);
    connectAuthEmulator(auth, "http://localhost:9099");
    console.log("✅ Connected to Firebase Emulators");
} else {
    db = getDatabase(app);
}


const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const usernameInput = document.getElementById("username-input");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const createAccountBtn = document.getElementById("create-account-btn");


loginBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("User signed in successfully");
        window.location.href = "/pages/index.html"; // Redirect to the main app page
    } catch (error) {
        console.error("Error signing in:", error);
        alert("Failed to sign in. Please check your credentials.");
    }
});

registerBtn.addEventListener("click", () => {
    if (loginBtn.style.display === "block") {
        loginBtn.style.display = "none";
        usernameInput.style.display = "block";
        createAccountBtn.style.display = "block";
        registerBtn.textContent = "Already have an account? Log in";
    }
    else {
        loginBtn.style.display = "block";
        usernameInput.style.display = "none";
        createAccountBtn.style.display = "none";
        registerBtn.textContent = "Don't have an account? Register";
    }
})

createAccountBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const username = usernameInput.value.trim();

    if (!username) {
        alert("Username cannot be empty");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const groceryRef = ref(db, `users/${uid}/groceryLists`);
        const snap = await get(groceryRef);

        await set(ref(db, `users/${uid}`), {
            email: email,
            username: username
        }).then(() => {
            console.log("User data saved successfully");
        }).catch((error) => {
            console.error("Error saving user data:", error);
        });

        if (!snap.exists()) {
            await set(groceryRef, { default: {}, sharedLists: {} });
            console.log("Default grocery list created for new user");
        }

        console.log("User registered successfully");

        const userRef = ref(db, `users/${uid}`);
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                window.location.href = "/pages/index.html"; // Redirect to the main app page
            }
        })
    } catch (error) {
        console.error("Error creating account:", error);
        alert(error.message);
    }
})

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user);
        // Redirect to the main app page if already signed in
        //window.location.href = "/pages/index.html";
    } else {
        console.log("No user is signed in");
    }
});

