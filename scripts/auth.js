import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { firebaseConfig } from "../config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
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
        createAccountBtn.style.display = "block";
        registerBtn.textContent = "Already have an account? Log in";
    }
    else {
        loginBtn.style.display = "block";
        createAccountBtn.style.display = "none";
        registerBtn.textContent = "Don't have an account? Register";
    }
})

createAccountBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("User registered successfully");
        window.location.href = "/pages/index.html"; // Redirect to the main app page
    } catch (error) {
        console.error("Error creating account:", error);
        alert(error.message);
    }
})

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user);
        // Optionally redirect to the main app page if already signed in
        window.location.href = "/pages/index.html";
    } else {
        console.log("No user is signed in");
    }
});

