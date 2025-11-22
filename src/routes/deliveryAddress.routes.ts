import { Router } from "express";
import { authMiddleware } from "@middleware/authMiddleware";
import {
    getAddresses,
    getAddressById,
    createAddress,
    updateAddress,
} from "@controllers/deliveryAddress.controller";
import {
    validateDeliveryAddressId,
    validateDeliveryAddressFields,
    validateDeliveryAddressQuery,
} from "@middleware/deliveryAddressMiddleware";

export const deliveryAddressAllowedSortFields = [
    "label",
    "street",
    "number",
    "neighborhood",
    "complement",
    "reference",
    "postalCode",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/:customerId",
    validateDeliveryAddressQuery({
        allowedSortFields: deliveryAddressAllowedSortFields,
    }),
    getAddresses
);
router.get("/detail/:id", validateDeliveryAddressId, getAddressById);
router.post("/", validateDeliveryAddressFields, createAddress);
router.put("/:id", validateDeliveryAddressId, validateDeliveryAddressFields, updateAddress);

export default router;
