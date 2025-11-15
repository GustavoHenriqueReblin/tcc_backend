import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllRecipeItems,
    getRecipeItemById,
    createRecipeItem,
    updateRecipeItem,
} from "@controllers/recipeItem.controller";
import {
    validateRecipeItemFields,
    validateRecipeItemPaginationAndFilter,
} from "@middleware/recipeItemMiddleware";

const router = Router();

router.use(authMiddleware, validateRecipeItemPaginationAndFilter);

router.get("/", getAllRecipeItems);
router.get("/:id", getRecipeItemById);
router.post("/", validateRecipeItemFields, createRecipeItem);
router.put("/:id", validateRecipeItemFields, updateRecipeItem);

export default router;
