import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    validateWarehouseFields,
    validateWarehouseQuery,
    validateWarehousesQuery,
} from "@middleware/warehouseMiddleware";
import {
    getAllWarehouses,
    getWarehouseById,
    createWarehouse,
    updateWarehouse,
} from "@controllers/warehouse.controller";

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateWarehousesQuery({
        allowSearch: true,
        allowedSortFields: ["code", "name", "description", "createdAt", "updatedAt"],
    }),
    getAllWarehouses
);
router.get("/:id", validateWarehouseQuery, getWarehouseById);
router.post("/", validateWarehouseFields, createWarehouse);
router.put("/:id", validateWarehouseFields, updateWarehouse);

export default router;
