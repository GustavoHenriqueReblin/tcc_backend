import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllProductionOrders,
    getProductionOrderById,
    createProductionOrder,
    updateProductionOrder,
} from "@controllers/productionOrder.controller";
import {
    validateProductionOrderFields,
    validateProductionOrderQuery,
    validateProductionOrderListQuery,
} from "@middleware/productionOrder.middleware";

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

router.use(authMiddleware);

router.get(
    "/",
    validateProductionOrderListQuery({
        allowSearch: true,
        allowedSortFields: productionOrderAllowedSortFields,
    }),
    getAllProductionOrders
);
router.get("/:id", validateProductionOrderQuery, getProductionOrderById);
router.post("/", validateProductionOrderFields, createProductionOrder);
router.put("/:id", validateProductionOrderFields, updateProductionOrder);

export default router;
