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
    validateProductionOrderQuery,
    validateProductionOrderPaginationAndFilter,
    validateProductionOrdersQuery,
} from "@middleware/productionOrderMiddleware";

export const productionOrderAllowedSortFields = [
    "code",
    "status",
    "plannedQty",
    "producedQty",
    "wasteQty",
    "startDate",
    "endDate",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware, validateProductionOrderPaginationAndFilter);

router.get(
    "/",
    validateProductionOrdersQuery({
        allowSearch: true,
        allowedSortFields: productionOrderAllowedSortFields,
    }),
    getAllProductionOrders
);
router.get("/:id", validateProductionOrderQuery, getProductionOrderById);
router.post("/", validateProductionOrderFields, createProductionOrder);
router.put("/:id", validateProductionOrderFields, updateProductionOrder);

export default router;
