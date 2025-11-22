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
    validatePurchaseOrderListQuery,
    validatePurchaseOrderQuery,
} from "@middleware/purchaseOrder.middleware";

export const purchaseOrderAllowedSortFields = ["code", "status", "createdAt", "updatedAt"];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validatePurchaseOrderListQuery({
        allowedSortFields: purchaseOrderAllowedSortFields,
    }),
    getAllPurchaseOrders
);
router.get("/:id", validatePurchaseOrderQuery, getPurchaseOrderById);
router.post("/", validatePurchaseOrderFields, createPurchaseOrder);
router.put("/:id", validatePurchaseOrderFields, updatePurchaseOrder);

export default router;
