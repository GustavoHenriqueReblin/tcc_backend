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
    validateRecipeItemListQuery,
    validateRecipeItemQuery,
} from "@middleware/recipeItem.middleware";

export const recipeItemAllowedSortFields = ["quantity", "createdAt", "updatedAt"];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateRecipeItemListQuery({
        allowedSortFields: recipeItemAllowedSortFields,
    }),
    getAllRecipeItems
);
router.get("/:id", validateRecipeItemQuery, getRecipeItemById);
router.post("/", validateRecipeItemFields, createRecipeItem);
router.put("/:id", validateRecipeItemFields, updateRecipeItem);

export default router;
