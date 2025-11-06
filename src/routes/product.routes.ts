import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
} from "@controllers/product.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);

export default router;
