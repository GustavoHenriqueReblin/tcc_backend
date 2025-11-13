import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllProductionOrders,
    getProductionOrderById,
    createProductionOrder,
    updateProductionOrder,
} from "@controllers/productionOrder.controller";
import {
    validateProductionOrderFields,
    validateProductionOrderPaginationAndFilter,
} from "@middleware/productionOrderMiddleware";

const router = Router();

router.use(authMiddleware, validateProductionOrderPaginationAndFilter);

router.get("/", getAllProductionOrders);
router.get("/:id", getProductionOrderById);
router.post("/", validateProductionOrderFields, createProductionOrder);
router.put("/:id", validateProductionOrderFields, updateProductionOrder);

export default router;

