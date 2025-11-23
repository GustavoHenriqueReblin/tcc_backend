import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateAccountsPayableFields,
    validateAccountsPayableListQuery,
    validateAccountsPayableQuery,
} from "@middleware/accountsPayable.middleware";
import {
    getAllAccountsPayable,
    getAccountsPayableById,
    createAccountsPayable,
    updateAccountsPayable,
} from "@controllers/accountsPayable.controller";

export const accountsPayableAllowedSortFields = [
    "description",
    "value",
    "dueDate",
    "paymentDate",
    "status",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateAccountsPayableListQuery({
        allowedSortFields: accountsPayableAllowedSortFields,
    }),
    getAllAccountsPayable
);
router.get("/:id", validateAccountsPayableQuery, getAccountsPayableById);
router.post("/", validateAccountsPayableFields, createAccountsPayable);
router.put("/:id", validateAccountsPayableFields, updateAccountsPayable);

export default router;
