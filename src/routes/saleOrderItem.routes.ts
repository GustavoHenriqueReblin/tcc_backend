import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllSaleOrderItems,
    getSaleOrderItemById,
    createSaleOrderItem,
    updateSaleOrderItem,
} from "@controllers/saleOrderItem.controller";
import {
    validateSaleOrderItemFields,
    validateSaleOrderItemPaginationAndFilter,
} from "@middleware/saleOrderItemMiddleware";

const router = Router();

router.use(authMiddleware, validateSaleOrderItemPaginationAndFilter);

router.get("/", getAllSaleOrderItems);
router.get("/:id", getSaleOrderItemById);
router.post("/", validateSaleOrderItemFields, createSaleOrderItem);
router.put("/:id", validateSaleOrderItemFields, updateSaleOrderItem);

export default router;
