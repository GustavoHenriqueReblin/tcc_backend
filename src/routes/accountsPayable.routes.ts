import { Router } from "express";
import { authMiddleware } from "@middleware/auth.middleware";
import {
    getAllAccountsPayable,
    getAccountsPayableById,
    createAccountsPayable,
    updateAccountsPayable,
} from "@controllers/accountsPayable.controller";
import {
    validateAccountsPayableFields,
    validateAccountsPayablePaginationAndFilter,
} from "@middleware/accountsPayable.middleware";

const router = Router();

router.use(authMiddleware, validateAccountsPayablePaginationAndFilter);

router.get("/", getAllAccountsPayable);
router.get("/:id", getAccountsPayableById);
router.post("/", validateAccountsPayableFields, createAccountsPayable);
router.put("/:id", validateAccountsPayableFields, updateAccountsPayable);

export default router;
