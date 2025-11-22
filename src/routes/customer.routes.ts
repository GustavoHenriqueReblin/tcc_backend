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

export const customerPersonAllowedSortFields = ["name", "legalName", "taxId"];
export const customerAllowedSortFields = ["createdAt", "updatedAt"];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateCustomersQuery({
        allowSearch: true,
        allowedSortFields: customerPersonAllowedSortFields.concat(customerAllowedSortFields),
    }),
    getAllCustomers
);
router.get("/:id", validateCustomerQuery, getCustomerById);
router.post("/", validateCustomerFields, createCustomer);
router.put("/:id", validateCustomerFields, updateCustomer);

export default router;
