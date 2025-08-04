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

            deleteBtn.addEventListener("click", async () => {
                const confirmDelete = confirm("Are you sure you want to delete this recipe?");
                if (confirmDelete) {
                    try {
                        await set(ref(db, `groceryLists/recipes/${recipeId}`), null);
                        console.log("Recipe deleted successfully");
                    } catch (error) {
                        console.error("Error deleting recipe:", error);
                    }
                }
            })

            editBtn.addEventListener("click", () => {
                showEditRecipe(recipeId, recipe);

                const ingredientsListRef = ref(db, `groceryLists/recipes/${recipeId}/ingredients`);
                onValue(ingredientsListRef, (snapshot) => {
                    const ingredientsList = document.getElementById("ingredients-list");
                    ingredientsList.innerHTML = ""; // Clear existing ingredients

                    if (snapshot.exists()) {
                        const ingredients = snapshot.val();
                        console.log("Ingredients:", ingredients);

                        for (let ingredientId in ingredients) {
                            const ingredient = ingredients[ingredientId];
                            const ingredientItem = document.createElement("li");
                            ingredientItem.innerHTML = `
                            <span class="ingredient-name">${ingredient.name}</span>
                            <span class="ingredient-instructions">${ingredient.instructions || ''}</span>
                            `;
                            ingredientsList.appendChild(ingredientItem);
                        }
                    }
                })
            });

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
                <div id="instructions-content" placeholder="Enter instructions">${recipe.instructions}</div>
                <textarea id="instructions-input" class="hide" placeholder="Enter instructions">${recipe.instructions}</textarea>
            </div>
            <div id="ingredients-container">
                <div id="ingredients-input-container" class="hide">
                    <input type="text" id="ingredient-input" placeholder="Add ingredient"/>
                    <input type="text" id="ingredient-instructions-input" placeholder="Instructions for ingredient (optional)"/>
                    <button id="add-ingredient-btn">Add</button>
                </div>
                <ul id="ingredients-list">
                
                </ul>
            </div>
            <button id="edit-list-btn">Edit</button>
            <button id="save-recipe-btn">Save</button>
            <button id="cancel-edit-btn" style="display: none;">Cancel</button>
        </div>
        `;

        mainContainer.appendChild(editSection);

        const saveRecipeBtn = document.getElementById("save-recipe-btn");
        saveRecipeBtn.addEventListener("click", async () => {
            const instructions = document.getElementById("instructions-input").value;

            try {
                await update(ref(db, `groceryLists/recipes/${recipeId}`), {
                    instructions: instructions
                });

                document.getElementById("instructions-content").textContent = instructions;
                console.log("Recipe updated successfully");

            } catch (error) {
                console.error("Error updating recipe:", error);
            }
            toggleEditState(false);
        })


        function toggleEditState(isEditing) {
            const instructionsEdit = document.getElementById("instructions-input");
            const ingredientsEdit = document.getElementById("ingredients-input-container");
            const instructionsContent = document.getElementById("instructions-content");

            if (isEditing) {
                instructionsEdit.classList.remove("hide");
                ingredientsEdit.classList.remove("hide");
                instructionsContent.classList.add("hide");
            } else {
                instructionsEdit.classList.add("hide");
                ingredientsEdit.classList.add("hide");
                instructionsContent.classList.remove("hide");
            }

        }

        const editListBtn = document.getElementById("edit-list-btn");
        editListBtn.addEventListener("click", () => toggleEditState(true));


        const addIngredientBtn = document.getElementById("add-ingredient-btn");
        addIngredientBtn.addEventListener("click", () => {
            const ingredientInput = document.getElementById("ingredient-input").value.trim();
            const ingredientInstructionsInput = document.getElementById("ingredient-instructions-input").value;

            if (ingredientInput) {
                const ingredientsList = document.getElementById("ingredients-list");

                try {
                    const newIngredientRef = push(ref(db, `groceryLists/recipes/${recipeId}/ingredients`));
                    set(newIngredientRef, {
                        name: ingredientInput,
                        instructions: ingredientInstructionsInput || "",
                    })

                } catch (error) {
                    console.error("Error adding ingredient:", error);
                }
            }
        })
    }


});