import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import { validateSupplierPaginationAndFilter } from "@middleware/supplierMiddleware";
import {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
} from "@controllers/supplier.controller";

const router = Router();

router.use(authMiddleware, validateSupplierPaginationAndFilter);

router.get("/", getAllSuppliers);
router.get("/:id", getSupplierById);
router.post("/", createSupplier);
router.put("/:id", updateSupplier);

export default router;
