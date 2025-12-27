import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateAssetCategoryFields,
    validateAssetCategoryListQuery,
    validateAssetCategoryQuery,
} from "@middleware/assetCategory.middleware";
import {
    getAllAssetCategories,
    getAssetCategoryById,
    createAssetCategory,
    updateAssetCategory,
} from "@controllers/assetCategory.controller";

export const assetCategoryAllowedSortFields = ["name", "description", "createdAt", "updatedAt"];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateAssetCategoryListQuery({
        allowedSortFields: assetCategoryAllowedSortFields,
    }),
    getAllAssetCategories
);
router.get("/:id", validateAssetCategoryQuery, getAssetCategoryById);
router.post("/", validateAssetCategoryFields, createAssetCategory);
router.put("/:id", validateAssetCategoryFields, updateAssetCategory);

export default router;
