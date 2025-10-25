import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAddresses,
    getAddressById,
    createAddress,
    updateAddress,
} from "@controllers/deliveryAddress.controller";

const router = Router();

router.use(authMiddleware);

router.get("/:customerId", getAddresses);
router.get("/detail/:id", getAddressById);
router.post("/", createAddress);
router.put("/:id", updateAddress);

export default router;
