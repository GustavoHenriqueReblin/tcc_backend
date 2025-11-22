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
    validateSaleOrderItemPaginationAndFilter,
} from "@middleware/saleOrderItem.middleware";

const router = Router();

router.use(authMiddleware, validateSaleOrderItemPaginationAndFilter);

router.get("/", getAllSaleOrderItems);
router.get("/:id", getSaleOrderItemById);
router.post("/", validateSaleOrderItemFields, createSaleOrderItem);
router.put("/:id", validateSaleOrderItemFields, updateSaleOrderItem);

export default router;
