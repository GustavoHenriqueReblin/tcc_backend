import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    validateCustomerFields,
    validateCustomerQuery,
    validateCustomersQuery,
} from "@middleware/customerMiddleware";
import {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
} from "@controllers/customer.controller";

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    getAllCustomers,
    validateCustomersQuery({
        allowSearch: true,
        allowedSortFields: ["name", "legalName", "createdAt", "updatedAt", "taxId"],
    })
);
router.get("/:id", getCustomerById, validateCustomerQuery);
router.post("/", validateCustomerFields, createCustomer);
router.put("/:id", validateCustomerFields, updateCustomer);

export default router;
