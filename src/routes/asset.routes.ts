import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateAssetFields,
    validateAssetListQuery,
    validateAssetQuery,
} from "@middleware/asset.middleware";
import {
    getAllAssets,
    getAssetById,
    createAsset,
    updateAsset,
} from "@controllers/asset.controller";

export const assetAllowedSortFields = [
    "name",
    "acquisitionDate",
    "acquisitionCost",
    "usefulLifeMonths",
    "salvageValue",
    "location",
    "status",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateAssetListQuery({
        allowedSortFields: assetAllowedSortFields,
    }),
    getAllAssets
);
router.get("/:id", validateAssetQuery, getAssetById);
router.post("/", validateAssetFields, createAsset);
router.put("/:id", validateAssetFields, updateAsset);

export default router;
