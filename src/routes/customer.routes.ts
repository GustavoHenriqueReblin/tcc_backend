import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import { validateCustomerPaginationAndFilter } from "@middleware/customerMiddleware";
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
router.post("/", createCustomer);
router.put("/:id", updateCustomer);

export default router;
