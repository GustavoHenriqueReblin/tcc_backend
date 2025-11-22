import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    validateSupplierFields,
    validateSupplierQuery,
    validateSuppliersQuery,
} from "@middleware/supplierMiddleware";
import {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
} from "@controllers/supplier.controller";

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateSuppliersQuery({
        allowSearch: true,
        allowedSortFields: ["name", "legalName", "createdAt", "updatedAt", "taxId"],
    }),
    getAllSuppliers
);
router.get("/:id", validateSupplierQuery, getSupplierById);
router.post("/", validateSupplierFields, createSupplier);
router.put("/:id", validateSupplierFields, updateSupplier);

export default router;
