import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    validateFinancialTransactionFields,
    validateFinancialTransactionListQuery,
    validateFinancialTransactionQuery,
} from "@middleware/financialTransaction.middleware";
import {
    getAllFinancialTransactions,
    getFinancialTransactionById,
    createFinancialTransaction,
    updateFinancialTransaction,
} from "@controllers/financialTransaction.controller";

export const financialTransactionAllowedSortFields = [
    "type",
    "value",
    "date",
    "category",
    "createdAt",
    "updatedAt",
];

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    validateFinancialTransactionListQuery({
        allowedSortFields: financialTransactionAllowedSortFields,
    }),
    getAllFinancialTransactions
);
router.get("/:id", validateFinancialTransactionQuery, getFinancialTransactionById);
router.post("/", validateFinancialTransactionFields, createFinancialTransaction);
router.put("/:id", validateFinancialTransactionFields, updateFinancialTransaction);

export default router;
