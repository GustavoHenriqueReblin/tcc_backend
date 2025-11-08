import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    validateSupplierFields,
    validateSupplierPaginationAndFilter,
} from "@middleware/supplierMiddleware";
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
router.post("/", validateSupplierFields, createSupplier);
router.put("/:id", validateSupplierFields, updateSupplier);

export default router;
