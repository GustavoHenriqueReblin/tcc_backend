import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllSaleOrderItems,
    getSaleOrderItemById,
    createSaleOrderItem,
    updateSaleOrderItem,
} from "@controllers/saleOrderItem.controller";
import {
    validateSaleOrderItemFields,
    validateSaleOrderItemListQuery,
    validateSaleOrderItemQuery,
} from "@middleware/saleOrderItem.middleware";

export const saleOrderItemAllowedSortFields = [
    "quantity",
    "unitPrice",
    "productUnitPrice",
    "unitCost",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateSaleOrderItemListQuery({
        allowedSortFields: saleOrderItemAllowedSortFields,
    }),
    getAllSaleOrderItems
);
router.get("/:id", validateSaleOrderItemQuery, getSaleOrderItemById);
router.post("/", validateSaleOrderItemFields, createSaleOrderItem);
router.put("/:id", validateSaleOrderItemFields, updateSaleOrderItem);

export default router;
