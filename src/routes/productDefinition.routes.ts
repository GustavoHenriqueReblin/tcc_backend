import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllProductDefinitions,
    getProductDefinitionById,
    createProductDefinition,
    updateProductDefinition,
} from "@controllers/productDefinition.controller";
import {
    validateProductDefinitionFields,
    validateProductDefinitionQuery,
    validateProductDefinitionsQuery,
} from "@middleware/productDefinition.middleware";

export const productDefinitionAllowedSortFields = [
    "name",
    "description",
    "type",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateProductDefinitionsQuery({
        allowSearch: true,
        allowedSortFields: productDefinitionAllowedSortFields,
    }),
    getAllProductDefinitions
);
router.get("/:id", validateProductDefinitionQuery, getProductDefinitionById);
router.post("/", validateProductDefinitionFields, createProductDefinition);
router.put("/:id", validateProductDefinitionFields, updateProductDefinition);

export default router;
