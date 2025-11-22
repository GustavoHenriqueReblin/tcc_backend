import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateWarehouseFields,
    validateWarehouseQuery,
    validateWarehousesQuery,
} from "@middleware/warehouse.middleware";
import {
    getAllWarehouses,
    getWarehouseById,
    createWarehouse,
    updateWarehouse,
} from "@controllers/warehouse.controller";

export const warehouseAllowedSortFields = ["code", "name", "description", "createdAt", "updatedAt"];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateWarehousesQuery({
        allowSearch: true,
        allowedSortFields: warehouseAllowedSortFields,
    }),
    getAllWarehouses
);
router.get("/:id", validateWarehouseQuery, getWarehouseById);
router.post("/", validateWarehouseFields, createWarehouse);
router.put("/:id", validateWarehouseFields, updateWarehouse);

export default router;
