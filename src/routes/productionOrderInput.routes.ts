import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllProductionOrderInputs,
    getProductionOrderInputById,
    createProductionOrderInput,
    updateProductionOrderInput,
} from "@controllers/productionOrderInput.controller";
import {
    validateProductionOrderInputFields,
    validateProductionOrderInputPaginationAndFilter,
} from "@middleware/productionOrderInputMiddleware";

const router = Router();

router.use(authMiddleware, validateProductionOrderInputPaginationAndFilter);

router.get("/", getAllProductionOrderInputs);
router.get("/:id", getProductionOrderInputById);
router.post("/", validateProductionOrderInputFields, createProductionOrderInput);
router.put("/:id", validateProductionOrderInputFields, updateProductionOrderInput);

export default router;

