import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import { validateWarehousePagination } from "@middleware/warehouseMiddleware";
import {
    getAllWarehouses,
    getWarehouseById,
    createWarehouse,
    updateWarehouse,
} from "@controllers/warehouse.controller";

const router = Router();

router.use(authMiddleware, validateWarehousePagination);

router.get("/", getAllWarehouses);
router.get("/:id", getWarehouseById);
router.post("/", createWarehouse);
router.put("/:id", updateWarehouse);

export default router;
