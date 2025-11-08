import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    validateCustomerFields,
    validateCustomerPaginationAndFilter,
} from "@middleware/customerMiddleware";
import {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
} from "@controllers/customer.controller";

const router = Router();

router.use(authMiddleware, validateCustomerPaginationAndFilter);

router.get("/", getAllCustomers);
router.get("/:id", getCustomerById);
router.post("/", validateCustomerFields, createCustomer);
router.put("/:id", validateCustomerFields, updateCustomer);

export default router;
