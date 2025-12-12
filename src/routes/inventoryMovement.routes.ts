import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateInventoryMovementListQuery,
    validateInventoryAdjustmentFields,
    validateHarvestFields,
} from "@middleware/inventoryMovement.middleware";
import {
    getInventoryMovements,
    createInventoryAdjustment,
    createHarvestEntry,
} from "@controllers/inventoryMovement.controller";

export const inventoryMovementAllowedSortFields = [
    "direction",
    "source",
    "quantity",
    "balance",
    "unitCost",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateInventoryMovementListQuery({
        allowSearch: true,
        allowedSortFields: inventoryMovementAllowedSortFields,
    }),
    getInventoryMovements
);

router.post("/adjustments", validateInventoryAdjustmentFields, createInventoryAdjustment);
router.post("/harvest", validateHarvestFields, createHarvestEntry);

export default router;
