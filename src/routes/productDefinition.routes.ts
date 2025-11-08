import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllProductDefinitions,
    getProductDefinitionById,
    createProductDefinition,
    updateProductDefinition,
} from "@controllers/productDefinition.controller";
import {
    validateProductDefinitionFields,
    validateProductDefinitionPaginationAndFilter,
} from "@middleware/productDefinitionMiddleware";

const router = Router();

router.use(authMiddleware, validateProductDefinitionPaginationAndFilter);

router.get("/", getAllProductDefinitions);
router.get("/:id", getProductDefinitionById);
router.post("/", validateProductDefinitionFields, createProductDefinition);
router.put("/:id", validateProductDefinitionFields, updateProductDefinition);

export default router;
