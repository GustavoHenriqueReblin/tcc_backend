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
    validateProductQuery,
    validateProductsQuery,
} from "@middleware/productMiddleware";

export const productAllowedSortFields = [
    "name",
    "barcode",
    "costValue",
    "saleValue",
    "quantity",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateProductsQuery({
        allowSearch: true,
        allowedSortFields: productAllowedSortFields,
    }),
    getAllProducts
);
router.get("/:id", validateProductQuery, getProductById);
router.post("/", validateProductFields, createProduct);
router.put("/:id", validateProductFields, updateProduct);

export default router;
