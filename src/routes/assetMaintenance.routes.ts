import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateAssetMaintenanceFields,
    validateAssetMaintenancePaginationAndFilter,
} from "@middleware/assetMaintenance.middleware";
import {
    getAllAssetMaintenances,
    getAssetMaintenanceById,
    createAssetMaintenance,
    updateAssetMaintenance,
} from "@controllers/assetMaintenance.controller";

const router = Router();

router.use(authMiddleware, validateAssetMaintenancePaginationAndFilter);

router.get("/", getAllAssetMaintenances);
router.get("/:id", getAssetMaintenanceById);
router.post("/", validateAssetMaintenanceFields, createAssetMaintenance);
router.put("/:id", validateAssetMaintenanceFields, updateAssetMaintenance);

export default router;
