import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllProductDefinitions,
    getProductDefinitionById,
    createProductDefinition,
    updateProductDefinition,
} from "@controllers/productDefinition.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getAllProductDefinitions);
router.get("/:id", getProductDefinitionById);
router.post("/", createProductDefinition);
router.put("/:id", updateProductDefinition);

export default router;
