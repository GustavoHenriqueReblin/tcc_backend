import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllFinancialTransactions,
    getFinancialTransactionById,
    createFinancialTransaction,
    updateFinancialTransaction,
} from "@controllers/financialTransaction.controller";
import {
    validateFinancialTransactionFields,
    validateFinancialTransactionPaginationAndFilter,
} from "@middleware/financialTransaction.middleware";

const router = Router();

router.use(authMiddleware, validateFinancialTransactionPaginationAndFilter);

router.get("/", getAllFinancialTransactions);
router.get("/:id", getFinancialTransactionById);
router.post("/", validateFinancialTransactionFields, createFinancialTransaction);
router.put("/:id", validateFinancialTransactionFields, updateFinancialTransaction);

export default router;
