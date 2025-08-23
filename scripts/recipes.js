import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, connectDatabaseEmulator, onValue, ref, get, set, push, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getAuth, onAuthStateChanged, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { firebaseConfig } from "../config.js";

import { setupSwipeWithHammer, setupEllipsisRevealDelete } from './utils.js';

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
    const userRecipesRef = ref(db, `users/${user.uid}/recipes`);

    const addRecipeBtn = document.getElementById("new-recipe-btn");
    const recipesList = document.getElementById("recipes-list");

    addRecipeBtn.addEventListener("click", async () => {
        const recipeName = prompt("Enter the name of the new recipe:");
        if (recipeName) {
            const newRecipeRef = push(ref(db, `users/${user.uid}/recipes`));

            try {
                await set(newRecipeRef, {
                    name: recipeName,
                    ingredients: {},
                    instructions: "",
                    createdAt: new Date(Date.now()).toLocaleDateString(),
                    owner: true,
                    username: userName
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
            <div class="swipe-wrapper">
                <div class="swipe-content">
                    <div class="recipe-details" data-recipe-id="${recipeId}">
                        <div class="recipe-info">
                            <i class="fa-solid fa-list "></i>
                            <h3 class="recipe-title">${recipe.name}</h3>
                            <p class="recipe-description">${recipe.description ?? ''}</p>
                        </div>
                        <i class="fa-solid fa-ellipsis drag-handle" aria-hidden="true"></i>
                    </div>
                </div>
            <button class="delete-btn-items fa fa-trash" title="Delete item" data-delete-id="-OX-7ngr0OZqvCcLYrsT" aria-hidden="true"></button>
            </div>
                
            `;
            const viewBtn = listItem.querySelector(".recipe-info");
            const deleteBtn = listItem.querySelector(".delete-btn-items");

            deleteBtn.addEventListener("click", async () => {
                const confirmDelete = confirm("Are you sure you want to delete this recipe?");
                if (confirmDelete) {
                    try {
                        await set(ref(db, `users/${user.uid}/recipes/${recipeId}`), null);
                        console.log("Recipe deleted successfully");
                    } catch (error) {
                        console.error("Error deleting recipe:", error);
                    }
                }
            })

            viewBtn.addEventListener("click", () => {
                showEditRecipe(recipeId, recipe);

                const ingredientsListRef = ref(db, `users/${user.uid}/recipes/${recipeId}/ingredients`);
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
        setupSwipeWithHammer();
        setupEllipsisRevealDelete(recipesList);
    }

    function showEditRecipe(recipeId, recipe) {
        document.getElementById("content-container").style.display = "none";
        const mainContainer = document.getElementById("main-content");

        const editSection = document.createElement("div");
        editSection.classList.add("edit-recipe-section");
        editSection.innerHTML = `
        <div class="edit-recipe-header">
            <div class="recipe-header-info">
                <i class="fa-solid fa-arrow-left" id="back-btn" aria-hidden="true"></i>
                <h1 class="recipe-title">${recipe.name}</h1>
            </div>
            <div id="instructions-container">
                <div class="instructions-header">
                    <h2 class="instructions-title">Instructions</h2>
                    <i class="fa-solid fa-pen edit-instructions">_</i>
                </div>
                <div id="instructions-content" placeholder="Enter instructions">${recipe.instructions}</div>
                <textarea id="instructions-input" class="hide" placeholder="Enter instructions" style="white-space: pre-wrap;">${recipe.instructions}</textarea>
            </div>
            <div id="ingredients-container">
                <div class="ingredients-list-container">
                    <h2 class="ingredients-title">Ingredients</h2>
                    <i class="fa-solid fa-pen edit-ingredients">_</i>
                </div>
                <div id="ingredients-input-container" class="hide">
                    <input type="text" id="ingredient-input" placeholder="Add ingredient"/>
                    <input type="text" id="ingredient-instructions-input" placeholder="Instructions for ingredient (optional)"/>
                    <button id="add-ingredient-btn">Add</button>
                </div>
                <ul id="ingredients-list">

                </ul>
            </div>
            <div id="grocery-list-container">
                <select id="select-grocery-list">
                    <option value="">Select grocery list</option>
                </select>
                <button id="copy-ingredients-btn">Add</button>
            </div>
        </div>
        <div class="edit-recipe-actions">
            
            <button id="save-recipe-btn" class="hide">Save</button>
            <button id="cancel-edit-btn" class="hide">Cancel</button>
        </div>
        `;

        mainContainer.appendChild(editSection);

        // Update the ingredient item template in the showEditRecipe function if ingredients exist

        async function fetchRecipeIngredients(preserveEditState = false) {
            const ingredientsRef = ref(db, `users/${user.uid}/recipes/${recipeId}/ingredients`);
            const ingredientsSnapshot = await get(ingredientsRef);

            if (!ingredientsSnapshot.exists()) {
                console.log("No ingredients found for this recipe");
                return;
            }

            const ingredientsList = document.getElementById("ingredients-list");
            ingredientsList.innerHTML = ""; // Clear existing ingredients

            const ingredients = ingredientsSnapshot.val();
            Object.entries(ingredients).forEach(([ingredientId, ingredient]) => {
                const ingredientsList = document.getElementById("ingredients-list");
                const ingredientItem = document.createElement("li");
                ingredientItem.innerHTML = `
                <div class="ingredient-item">
                    <input type="checkbox" class="ingredient-selector" data-ingredient-id="${ingredientId}">
                    <div class="ingredient-content">
                        <span class="ingredient-name">${ingredient.name}</span>
                        <span class="ingredient-instructions">${ingredient.instructions || ''}</span>
                    </div>
                    <i class="fa-solid fa-trash delete-ingredient ${preserveEditState ? '' : 'hide'}" data-ingredient-id="${ingredientId}"></i>
                </div>
            `;

                const deleteIngredientBtn = ingredientItem.querySelector(".delete-ingredient");
                deleteIngredientBtn.addEventListener("click", () => {
                    deleteIngredient(ingredientId);
                });
                ingredientsList.appendChild(ingredientItem);
            });
        }
        fetchRecipeIngredients();

        async function fetchGroceryLists() {
            const selectGroceryList = document.getElementById("select-grocery-list");

            const personalListOption = document.createElement("option");
            personalListOption.value = "personal";
            personalListOption.textContent = "Personal List";
            selectGroceryList.appendChild(personalListOption);

            const groceryListRef = ref(db, "groceryLists/lists");
            const groceryListSnapshot = await get(groceryListRef);


            if (groceryListSnapshot.exists()) {
                const groceryLists = groceryListSnapshot.val();

                for (let listId in groceryLists) {
                    const option = document.createElement("option");
                    option.value = listId;
                    option.textContent = groceryLists[listId].name;
                    selectGroceryList.appendChild(option);
                }
            }

        }
        fetchGroceryLists();

        const copyIngredientsBtn = document.getElementById("copy-ingredients-btn");
        copyIngredientsBtn.addEventListener("click", async () => {
            // get all selected ingredients
            const selectedIngredients = new Array;
            const ingredientSelectors = document.querySelectorAll(".ingredient-selector:checked");

            if (ingredientSelectors.length === 0) {
                return;
            }

            ingredientSelectors.forEach(selector => {
                const ingredientName = selector.closest(".ingredient-item").querySelector(".ingredient-name").textContent;
                const ingredientInstructions = selector.closest(".ingredient-item").querySelector(".ingredient-instructions").textContent;
                selectedIngredients.push({ name: ingredientName, instructions: ingredientInstructions });
            })

            console.log("Selected ingredients:", selectedIngredients);

            if (selectedIngredients.length > 0) {
                const selectedListId = document.getElementById("select-grocery-list").value;

                try {

                    if (selectedListId === "personal") {
                        try {
                            const personalListRef = ref(db, `users/${user.uid}/groceryLists/default`);

                            for (const ingredient of selectedIngredients) {
                                const newIngredientRef = push(personalListRef);

                                await set(newIngredientRef, {
                                    name: ingredient.name,
                                    description: ingredient.instructions,
                                    completed: false,
                                    order: 0
                                });
                                console.log("Ingredient copied to personal list:", ingredient.name);
                                alert("Ingredients copied to your personal list");

                            }
                        } catch (error) {
                            console.error("Error copying ingredients to personal list:", error);
                            alert("Failed to copy ingredients to personal list");
                        }
                    } else {
                        const listsRef = ref(db, `groceryLists/lists`);
                        const snapshot = await get(listsRef);

                        if (snapshot.exists()) {
                            const lists = snapshot.val();

                            if (selectedListId) {
                                const selectedListRef = ref(db, `groceryLists/lists/${selectedListId}`);
                                const selectedListSnapshot = await get(selectedListRef);

                                if (selectedListSnapshot.exists()) {
                                    const selectedList = selectedListSnapshot.val();
                                    const ingredientsRef = ref(db, `groceryLists/lists/${selectedListId}/ingredients`);

                                    for (const ingredient of selectedIngredients) {
                                        const newIngredientRef = push(ingredientsRef);
                                        await set(newIngredientRef, {
                                            name: ingredient.name,
                                            instructions: ingredient.instructions
                                        });
                                        console.log("Ingredient copied to list:", ingredient.name);
                                    }
                                }
                            }
                        }

                    }

                } catch (err) {
                    console.error("Error copying ingredients:", err);
                    alert("Failed to copy ingredients to list");
                }
            }
        })

        async function saveInstructions() {
            const instructions = document.getElementById("instructions-input").value;

            try {
                await update(ref(db, `users/${user.uid}/recipes/${recipeId}`), {
                    instructions: instructions
                });

                document.getElementById("instructions-content").textContent = instructions;
                console.log("Recipe updated successfully");

            } catch (error) {
                console.error("Error updating recipe:", error);
            }
            toggleEditState(false);
        }


        function toggleEditState(ingredients, instructions) {
            const instructionsEdit = document.getElementById("instructions-input");
            const ingredientsEdit = document.getElementById("ingredients-input-container");
            const instructionsContent = document.getElementById("instructions-content");
            const deleteIngredientBtns = document.querySelectorAll(".delete-ingredient");
            const ingredientsInputContainer = document.getElementById("ingredients-input-container");
            const ingredientsList = document.getElementById("ingredients-list");
            const inputInstructions = document.getElementById("instructions-input");

            switch (ingredients) {
                case true:
                    ingredientsEdit.classList.remove("hide");
                    deleteIngredientBtns.forEach(btn => btn.classList.remove("hide"));
                    ingredientsInputContainer.classList.remove("hide");
                    editIngredientsBtn.classList.add("fa-check");
                    editIngredientsBtn.classList.remove("fa-pen");
                    editIngredientsBtn.textContent = "";

                    break;
                case false:
                    ingredientsEdit.classList.add("hide");
                    deleteIngredientBtns.forEach(btn => btn.classList.add("hide"));
                    ingredientsInputContainer.classList.add("hide");
                    ingredientsList.classList.remove("hide");
                    editIngredientsBtn.classList.add("fa-pen");
                    editIngredientsBtn.classList.remove("fa-check");
                    editIngredientsBtn.textContent = "_";

                    break;
                default:
                    ingredientsEdit.classList.add("hide");
                    deleteIngredientBtns.forEach(btn => btn.classList.add("hide"));
                    ingredientsInputContainer.classList.add("hide");
                    ingredientsList.classList.remove("hide");
                    editIngredientsBtn.classList.add("fa-pen");
                    editIngredientsBtn.classList.remove("fa-check");
                    editIngredientsBtn.textContent = "_";
            }

            switch (instructions) {
                case true:
                    instructionsEdit.classList.remove("hide");
                    instructionsContent.classList.add("hide");
                    instructionsEdit.focus();
                    inputInstructions.classList.remove("hide");
                    instructionsContent.classList.add("hide");
                    editInstructionsBtn.classList.add("fa-check");
                    editInstructionsBtn.classList.remove("fa-pen");
                    editInstructionsBtn.textContent = "";

                    break;
                case false:
                    instructionsEdit.classList.add("hide");
                    instructionsContent.classList.remove("hide");

                    inputInstructions.classList.add("hide");
                    instructionsContent.classList.remove("hide");
                    editInstructionsBtn.classList.add("fa-pen");
                    editInstructionsBtn.classList.remove("fa-check");
                    editInstructionsBtn.textContent = "_";

                    break;
                default:
                    instructionsEdit.classList.add("hide");
                    instructionsContent.classList.remove("hide");
                    inputInstructions.classList.add("hide");
                    instructionsContent.classList.remove("hide");
                    editInstructionsBtn.classList.add("fa-pen");
                    editInstructionsBtn.classList.remove("fa-check");
                    editInstructionsBtn.textContent = "_";
            }
        }

        function autoResizeTextarea(textarea) {
            const scrollPosition = window.scrollY;

            textarea.style.height = '0px';
            textarea.style.height = textarea.scrollHeight + 'px';

            window.scrollTo(0, scrollPosition);
        }

        const editInstructionsBtn = document.querySelector(".edit-instructions");
        editInstructionsBtn.addEventListener("click", () => {
            const inputInstructions = document.getElementById("instructions-input");
            const instructionsContent = document.getElementById("instructions-content");

            inputInstructions.addEventListener("input", () => {
                autoResizeTextarea(inputInstructions);
            });

            if (inputInstructions.classList.contains("hide")) {
                toggleEditState(false, true);
                autoResizeTextarea(inputInstructions);
            } else {
                saveInstructions();
                toggleEditState(false, false);
            }
        })

        const editIngredientsBtn = document.querySelector(".edit-ingredients");
        editIngredientsBtn.addEventListener("click", () => {
            const ingredientsInputContainer = document.getElementById("ingredients-input-container");

            if (ingredientsInputContainer.classList.contains("hide")) {
                toggleEditState(true, false);
            } else {
                toggleEditState(false, false);
            }
        })

        const addIngredientBtn = document.getElementById("add-ingredient-btn");
        addIngredientBtn.addEventListener("click", () => {
            const ingredientInput = document.getElementById("ingredient-input").value.trim();
            const ingredientInstructionsInput = document.getElementById("ingredient-instructions-input").value;

            if (ingredientInput) {
                const ingredientsList = document.getElementById("ingredients-list");

                try {
                    const newIngredientRef = push(ref(db, `users/${user.uid}/recipes/${recipeId}/ingredients`));
                    set(newIngredientRef, {
                        name: ingredientInput,
                        instructions: ingredientInstructionsInput || "",
                    })

                    fetchRecipeIngredients();

                    console.log("Ingredient added successfully:", ingredientInput);

                } catch (error) {
                    console.error("Error adding ingredient:", error);
                }
            }
        })

        async function deleteIngredient(ingredientId) {
            const ingredientRef = ref(db, `users/${user.uid}/recipes/${recipeId}/ingredients/${ingredientId}`);
            const promptDelete = confirm("Are you sure you want to delete this ingredient?");

            if (!promptDelete) {
                return;
            }

            try {
                await set(ingredientRef, null);
                console.log("Ingredient deleted successfully:", ingredientId);
                await fetchRecipeIngredients(true);

            } catch (error) {
                console.error("Error deleting ingredient:", error);
            }

        }

        const backBtn = document.getElementById("back-btn");
        backBtn.addEventListener("click", () => {
            editSection.remove();
            document.getElementById("content-container").style.display = "block";
        });
    }


});