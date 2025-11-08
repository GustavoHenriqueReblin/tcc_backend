import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    validateWarehouseFields,
    validateWarehousePaginationAndFilter,
} from "@middleware/warehouseMiddleware";
import {
    getAllWarehouses,
    getWarehouseById,
    createWarehouse,
    updateWarehouse,
} from "@controllers/warehouse.controller";

const router = Router();

router.use(authMiddleware, validateWarehousePaginationAndFilter);

router.get("/", getAllWarehouses);
router.get("/:id", getWarehouseById);
router.post("/", validateWarehouseFields, createWarehouse);
router.put("/:id", validateWarehouseFields, updateWarehouse);

export default router;
