import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
} from "@controllers/customer.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getAllCustomers);
router.get("/:id", getCustomerById);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);

export default router;
