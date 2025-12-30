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
    validateSaleOrderListQuery,
    validateSaleOrderQuery,
} from "@middleware/saleOrder.middleware";

export const saleOrderAllowedSortFields = [
    "code",
    "status",
    "discount",
    "otherCosts",
    "totalValue",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateSaleOrderListQuery({
        allowedSortFields: saleOrderAllowedSortFields,
    }),
    getAllSaleOrders
);
router.get("/:id", validateSaleOrderQuery, getSaleOrderById);
router.post("/", validateSaleOrderFields, createSaleOrder);
router.put("/:id", validateSaleOrderFields, updateSaleOrder);

export default router;
