import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    validateInventoryMovementPaginationAndFilter,
    validateInventoryMovementsQuery,
} from "@middleware/inventoryMovementMiddleware";
import { getInventoryMovements } from "@controllers/inventoryMovement.controller";

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

router.use(authMiddleware, validateInventoryMovementPaginationAndFilter);

router.get(
    "/",
    validateInventoryMovementsQuery({
        allowSearch: true,
        allowedSortFields: inventoryMovementAllowedSortFields,
    }),
    getInventoryMovements
);

export default router;
