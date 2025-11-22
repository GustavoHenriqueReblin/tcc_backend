import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllRecipeItems,
    getRecipeItemById,
    createRecipeItem,
    updateRecipeItem,
} from "@controllers/recipeItem.controller";
import {
    validateRecipeItemFields,
    validateRecipeItemPaginationAndFilter,
} from "@middleware/recipeItem.middleware";

const router = Router();

router.use(authMiddleware, validateRecipeItemPaginationAndFilter);

router.get("/", getAllRecipeItems);
router.get("/:id", getRecipeItemById);
router.post("/", validateRecipeItemFields, createRecipeItem);
router.put("/:id", validateRecipeItemFields, updateRecipeItem);

export default router;
