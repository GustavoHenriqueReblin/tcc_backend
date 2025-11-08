import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAddresses,
    getAddressById,
    createAddress,
    updateAddress,
} from "@controllers/deliveryAddress.controller";
import {
    validateDeliveryAddressFields,
    validateDeliveryAddressPaginationAndFilter,
} from "@middleware/deliveryAddressMiddleware";

const router = Router();

router.use(authMiddleware, validateDeliveryAddressPaginationAndFilter);

router.get("/:customerId", getAddresses);
router.get("/detail/:id", getAddressById);
router.post("/", validateDeliveryAddressFields, createAddress);
router.put("/:id", validateDeliveryAddressFields, updateAddress);

export default router;
