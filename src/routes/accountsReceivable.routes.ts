import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllAccountsReceivable,
    getAccountsReceivableById,
    createAccountsReceivable,
    updateAccountsReceivable,
} from "@controllers/accountsReceivable.controller";
import {
    validateAccountsReceivableFields,
    validateAccountsReceivablePaginationAndFilter,
} from "@middleware/accountsReceivable.middleware";

const router = Router();

router.use(authMiddleware, validateAccountsReceivablePaginationAndFilter);

router.get("/", getAllAccountsReceivable);
router.get("/:id", getAccountsReceivableById);
router.post("/", validateAccountsReceivableFields, createAccountsReceivable);
router.put("/:id", validateAccountsReceivableFields, updateAccountsReceivable);

export default router;
