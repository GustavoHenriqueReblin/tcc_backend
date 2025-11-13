import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
} from "@controllers/recipe.controller";
import { validateRecipeFields, validateRecipePaginationAndFilter } from "@middleware/recipeMiddleware";

const router = Router();

router.use(authMiddleware, validateRecipePaginationAndFilter);

router.get("/", getAllRecipes);
router.get("/:id", getRecipeById);
router.post("/", validateRecipeFields, createRecipe);
router.put("/:id", validateRecipeFields, updateRecipe);

export default router;

