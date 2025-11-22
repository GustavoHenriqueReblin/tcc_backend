import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateAssetCategoryFields,
    validateAssetCategoryPaginationAndFilter,
} from "@middleware/assetCategory.middleware";
import {
    getAllAssetCategories,
    getAssetCategoryById,
    createAssetCategory,
    updateAssetCategory,
} from "@controllers/assetCategory.controller";

const router = Router();

router.use(authMiddleware, validateAssetCategoryPaginationAndFilter);

router.get("/", getAllAssetCategories);
router.get("/:id", getAssetCategoryById);
router.post("/", validateAssetCategoryFields, createAssetCategory);
router.put("/:id", validateAssetCategoryFields, updateAssetCategory);

export default router;
