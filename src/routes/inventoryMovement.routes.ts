import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import { validateInventoryMovementPaginationAndFilter } from "@middleware/inventoryMovementMiddleware";
import { getInventoryMovements } from "@controllers/inventoryMovement.controller";

const router = Router();

router.use(authMiddleware, validateInventoryMovementPaginationAndFilter);

router.get("/", getInventoryMovements);

export default router;
