import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    validateInventoryMovementPaginationAndFilter,
    validateInventoryMovementsQuery,
} from "@middleware/inventoryMovementMiddleware";
import { getInventoryMovements } from "@controllers/inventoryMovement.controller";

const router = Router();

router.use(authMiddleware, validateInventoryMovementPaginationAndFilter);

router.get(
    "/",
    validateInventoryMovementsQuery({
        allowSearch: true,
        allowedSortFields: [
            "direction",
            "source",
            "quantity",
            "balance",
            "unitCost",
            "createdAt",
            "updatedAt",
        ],
    }),
    getInventoryMovements
);

export default router;
