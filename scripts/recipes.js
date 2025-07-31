import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, connectDatabaseEmulator, onValue, ref, get, set, push, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
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
    const userRecipesRef = ref(db, "groceryLists/recipes");

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

    function listenToRecipes(recipesRef) {
        render(null);

        onValue(recipesRef, (snapshot) => {
            if (snapshot.exists()) {
                const recipes = snapshot.val();
                console.log("Recipes:", recipes);

                render(recipes);
            } else {
                render([]);
                console.log("No recipes found");
            }
        })
    }

    listenToRecipes(userRecipesRef);

    function render(recipes) {
        if (!recipes) {
            let skeletonRecipes = "";
            for (let i = 0; i < 3; i++) {
                skeletonRecipes += `
                    <li class="skeleton-item">
                    <div class="skeleton-container">
                        <div class="list__item_checkbox">
                            <div class="skeleton-checkbox"></div>
                            <div class="skeleton-content">
                                <div class="skeleton-title"></div>
                                <div class="skeleton-description"></div>
                            </div>
                        </div>
                        <div class="skeleton-drag"></div>
                    </div>
                </li>
                `;
            }

            recipesList.innerHTML = skeletonRecipes;
            return;
        }

        recipesList.innerHTML = "";

        for (let recipeId in recipes) {
            const recipe = recipes[recipeId];
            const listItem = document.createElement("li");
            listItem.classList.add("recipe-item");
            listItem.innerHTML = `
            <div class="recipe-details">
                <h3 class="recipe-title">${recipe.name}</h3>
                <p class="recipe-description">${recipe.description ?? ''}</p>
            </div>
            <div class="recipe-actions">
                <button class="edit-recipe-btn" data-recipe-id="${recipeId}">Edit</button>
                <button class="delete-recipe-btn" data-recipe-id="${recipeId}">Delete</button>
            </div>
            `;
            const editBtn = listItem.querySelector(".edit-recipe-btn");
            const deleteBtn = listItem.querySelector(".delete-recipe-btn");

            editBtn.addEventListener("click", () => showEditRecipe(recipeId, recipe));

            recipesList.appendChild(listItem);
        }
    }

    function showEditRecipe(recipeId, recipe) {
        document.getElementById("content-container").style.display = "none";
        const mainContainer = document.getElementById("main-content");

        const editSection = document.createElement("div");
        editSection.classList.add("edit-recipe-section");
        editSection.innerHTML = `
        <div class="edit-recipe-header">
            <h1>${recipe.name}</h1>
            <div id="instructions-container">
                <div id="instructions-content">${recipe.instructions}</div>
                <textarea id="instructions-input" style="display:none;">${recipe.instructions}</textarea>
            </div>
            <div id="ingredients-container">
                <input type="text" id="ingredient-input" placeholder="Add ingredient" style="display:none;"/>
                <ul id="ingredients-list">
                    
                </ul>
            </div>
            <button id="add-ingredient-btn">Edit</button>
            
        </div>
        `;

        mainContainer.appendChild(editSection);
    }

});