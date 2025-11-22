import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
} from "@controllers/recipe.controller";
import {
    validateRecipeFields,
    validateRecipeListQuery,
    validateRecipeQuery,
} from "@middleware/recipe.middleware";

export const recipeAllowedSortFields = ["description", "notes", "createdAt", "updatedAt"];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateRecipeListQuery({
        allowedSortFields: recipeAllowedSortFields,
    }),
    getAllRecipes
);
router.get("/:id", validateRecipeQuery, getRecipeById);
router.post("/", validateRecipeFields, createRecipe);
router.put("/:id", validateRecipeFields, updateRecipe);

export default router;
