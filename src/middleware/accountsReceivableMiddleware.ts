import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { AccountsReceivableInput } from "@services/accountsReceivable.service";
import { Request, Response, NextFunction } from "express";

export const ACCOUNTS_RECEIVABLE_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid PaymentStatus",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateAccountsReceivablePaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", status } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.PAGINATION });
    }

    if (status && !Object.values(PaymentStatus).includes(status as PaymentStatus)) {
        return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.INVALID_STATUS });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (status) req.query.status = status as string;

    next();
};

export const validateAccountsReceivableFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const receivable = req.body as AccountsReceivableInput;

    if (!receivable || receivable.value === undefined || !receivable.dueDate) {
        return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.MISSING_FIELDS });
    }

    if (
        receivable.status &&
        !Object.values(PaymentStatus).includes(receivable.status as PaymentStatus)
    ) {
        return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.WRONG_FIELD_VALUE });
    }

    if (
        receivable.method &&
        !Object.values(PaymentMethod).includes(receivable.method as PaymentMethod)
    ) {
        return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
