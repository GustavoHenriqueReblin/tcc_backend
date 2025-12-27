import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllPurchaseOrderItems,
    getPurchaseOrderItemById,
    createPurchaseOrderItem,
    updatePurchaseOrderItem,
} from "@controllers/purchaseOrderItem.controller";
import {
    validatePurchaseOrderItemFields,
    validatePurchaseOrderItemListQuery,
    validatePurchaseOrderItemQuery,
} from "@middleware/purchaseOrderItem.middleware";

export const purchaseOrderItemAllowedSortFields = [
    "quantity",
    "unitCost",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validatePurchaseOrderItemListQuery({
        allowedSortFields: purchaseOrderItemAllowedSortFields,
    }),
    getAllPurchaseOrderItems
);
router.get("/:id", validatePurchaseOrderItemQuery, getPurchaseOrderItemById);
router.post("/", validatePurchaseOrderItemFields, createPurchaseOrderItem);
router.put("/:id", validatePurchaseOrderItemFields, updatePurchaseOrderItem);

export default router;
