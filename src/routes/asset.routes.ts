import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import { validateAssetFields, validateAssetPaginationAndFilter } from "@middleware/assetMiddleware";
import {
    getAllAssets,
    getAssetById,
    createAsset,
    updateAsset,
} from "@controllers/asset.controller";

const router = Router();

router.use(authMiddleware, validateAssetPaginationAndFilter);

router.get("/", getAllAssets);
router.get("/:id", getAssetById);
router.post("/", validateAssetFields, createAsset);
router.put("/:id", validateAssetFields, updateAsset);

export default router;
