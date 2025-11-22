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
    validateRecipePaginationAndFilter,
} from "@middleware/recipe.middleware";

const router = Router();

router.use(authMiddleware, validateRecipePaginationAndFilter);

router.get("/", getAllRecipes);
router.get("/:id", getRecipeById);
router.post("/", validateRecipeFields, createRecipe);
router.put("/:id", validateRecipeFields, updateRecipe);

export default router;
