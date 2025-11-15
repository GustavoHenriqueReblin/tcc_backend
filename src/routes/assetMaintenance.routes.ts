import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    validateAssetMaintenanceFields,
    validateAssetMaintenancePaginationAndFilter,
} from "@middleware/assetMaintenanceMiddleware";
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
