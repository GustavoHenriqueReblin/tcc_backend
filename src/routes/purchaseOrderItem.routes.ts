import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllPurchaseOrderItems,
    getPurchaseOrderItemById,
    createPurchaseOrderItem,
    updatePurchaseOrderItem,
} from "@controllers/purchaseOrderItem.controller";
import {
    validatePurchaseOrderItemFields,
    validatePurchaseOrderItemPaginationAndFilter,
} from "@middleware/purchaseOrderItemMiddleware";

const router = Router();

router.use(authMiddleware, validatePurchaseOrderItemPaginationAndFilter);

router.get("/", getAllPurchaseOrderItems);
router.get("/:id", getPurchaseOrderItemById);
router.post("/", validatePurchaseOrderItemFields, createPurchaseOrderItem);
router.put("/:id", validatePurchaseOrderItemFields, updatePurchaseOrderItem);

export default router;

