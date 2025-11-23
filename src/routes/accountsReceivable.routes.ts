import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateAccountsReceivableFields,
    validateAccountsReceivableListQuery,
    validateAccountsReceivableQuery,
} from "@middleware/accountsReceivable.middleware";
import {
    getAllAccountsReceivable,
    getAccountsReceivableById,
    createAccountsReceivable,
    updateAccountsReceivable,
} from "@controllers/accountsReceivable.controller";

export const accountsReceivableAllowedSortFields = [
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
    validateAccountsReceivableListQuery({
        allowedSortFields: accountsReceivableAllowedSortFields,
    }),
    getAllAccountsReceivable
);
router.get("/:id", validateAccountsReceivableQuery, getAccountsReceivableById);
router.post("/", validateAccountsReceivableFields, createAccountsReceivable);
router.put("/:id", validateAccountsReceivableFields, updateAccountsReceivable);

export default router;
