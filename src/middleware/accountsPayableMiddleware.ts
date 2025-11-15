import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { AccountsPayableInput } from "@services/accountsPayable.service";
import { Request, Response, NextFunction } from "express";

export const ACCOUNTS_PAYABLE_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid PaymentStatus",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateAccountsPayablePaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: ACCOUNTS_PAYABLE_ERROR.PAGINATION });
    }

    if (status && !Object.values(PaymentStatus).includes(status as PaymentStatus)) {
        return res.status(400).json({ message: ACCOUNTS_PAYABLE_ERROR.INVALID_STATUS });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (status) req.query.status = status as string;

    next();
};

export const validateAccountsPayableFields = (req: Request, res: Response, next: NextFunction) => {
    const payable = req.body as AccountsPayableInput;

    if (!payable || payable.value === undefined || !payable.dueDate) {
        return res.status(400).json({ message: ACCOUNTS_PAYABLE_ERROR.MISSING_FIELDS });
    }

    if (payable.status && !Object.values(PaymentStatus).includes(payable.status as PaymentStatus)) {
        return res.status(400).json({ message: ACCOUNTS_PAYABLE_ERROR.WRONG_FIELD_VALUE });
    }

    if (payable.method && !Object.values(PaymentMethod).includes(payable.method as PaymentMethod)) {
        return res.status(400).json({ message: ACCOUNTS_PAYABLE_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
