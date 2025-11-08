import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
} from "@controllers/product.controller";
import {
    validateProductFields,
    validateProductPaginationAndFilter,
} from "@middleware/productMiddleware";

const router = Router();

router.use(authMiddleware, validateProductPaginationAndFilter);

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", validateProductFields, createProduct);
router.put("/:id", validateProductFields, updateProduct);

export default router;
