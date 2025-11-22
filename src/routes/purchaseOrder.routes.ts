import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
} from "@controllers/purchaseOrder.controller";
import {
    validatePurchaseOrderFields,
    validatePurchaseOrderPaginationAndFilter,
} from "@middleware/purchaseOrder.middleware";

const router = Router();

router.use(authMiddleware, validatePurchaseOrderPaginationAndFilter);

router.get("/", getAllPurchaseOrders);
router.get("/:id", getPurchaseOrderById);
router.post("/", validatePurchaseOrderFields, createPurchaseOrder);
router.put("/:id", validatePurchaseOrderFields, updatePurchaseOrder);

export default router;
