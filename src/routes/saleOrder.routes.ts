import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllSaleOrders,
    getSaleOrderById,
    createSaleOrder,
    updateSaleOrder,
} from "@controllers/saleOrder.controller";
import {
    validateSaleOrderFields,
    validateSaleOrderPaginationAndFilter,
} from "@middleware/saleOrder.middleware";

const router = Router();

router.use(authMiddleware, validateSaleOrderPaginationAndFilter);

router.get("/", getAllSaleOrders);
router.get("/:id", getSaleOrderById);
router.post("/", validateSaleOrderFields, createSaleOrder);
router.put("/:id", validateSaleOrderFields, updateSaleOrder);

export default router;
