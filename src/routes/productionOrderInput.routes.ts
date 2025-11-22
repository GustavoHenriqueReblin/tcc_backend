import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllProductionOrderInputs,
    getProductionOrderInputById,
    createProductionOrderInput,
    updateProductionOrderInput,
} from "@controllers/productionOrderInput.controller";
import {
    validateProductionOrderInputFields,
    validateProductionOrderInputListQuery,
    validateProductionOrderInputQuery,
} from "@middleware/productionOrderInput.middleware";

export const productionOrderInputAllowedSortFields = [
    "quantity",
    "unitCost",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateProductionOrderInputListQuery({
        allowedSortFields: productionOrderInputAllowedSortFields,
    }),
    getAllProductionOrderInputs
);
router.get("/:id", validateProductionOrderInputQuery, getProductionOrderInputById);
router.post("/", validateProductionOrderInputFields, createProductionOrderInput);
router.put("/:id", validateProductionOrderInputFields, updateProductionOrderInput);

export default router;
