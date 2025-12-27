import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateAssetMaintenanceFields,
    validateAssetMaintenanceListQuery,
    validateAssetMaintenanceQuery,
} from "@middleware/assetMaintenance.middleware";
import {
    getAllAssetMaintenances,
    getAssetMaintenanceById,
    createAssetMaintenance,
    updateAssetMaintenance,
} from "@controllers/assetMaintenance.controller";

export const assetMaintenanceAllowedSortFields = [
    "type",
    "cost",
    "date",
    "technician",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateAssetMaintenanceListQuery({
        allowedSortFields: assetMaintenanceAllowedSortFields,
    }),
    getAllAssetMaintenances
);
router.get("/:id", validateAssetMaintenanceQuery, getAssetMaintenanceById);
router.post("/", validateAssetMaintenanceFields, createAssetMaintenance);
router.put("/:id", validateAssetMaintenanceFields, updateAssetMaintenance);

export default router;
