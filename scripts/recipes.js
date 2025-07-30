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

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/pages/auth.html";
        return;
    }

    console.log("User is authenticated:", user.uid);

    const userNameRef = ref(db, `users/${user.uid}/username`);
    const userNameSnapshot = await get(userNameRef);
    const userName = userNameSnapshot.exists() ? userNameSnapshot.val() : "Guest";

    const addRecipeBtn = document.getElementById("new-recipe-btn");
    const recipesList = document.getElementById("recipes-list");

    addRecipeBtn.addEventListener("click", async () => {
        const recipeName = prompt("Enter the name of the new recipe:");
        if (recipeName) {
            const newRecipeRef = push(ref(db, "groceryLists/recipes"));

            try {
                await set(newRecipeRef, {
                    name: recipeName,
                    ingredients: {},
                    instructions: "",
                    createdAt: new Date(Date.now()).toLocaleDateString(),
                    createdBy: {
                        id: user.uid,
                        name: userName
                    }
                })

                console.log("Recipe added successfully:", recipeName);
            } catch (error) {
                console.error("Error adding recipe:", error);
            }
        }
    })

});