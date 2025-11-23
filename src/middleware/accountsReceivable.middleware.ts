import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { AccountsReceivableInput } from "@services/accountsReceivable.service";
import { Request, Response, NextFunction } from "express";

export const ACCOUNTS_RECEIVABLE_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_STATUS: "status must be a valid PaymentStatus",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface AccountsReceivableListQueryOptions {
    allowedSortFields?: string[];
}

export const validateAccountsReceivableQuery = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.ID });
    }

    next();
};

export const validateAccountsReceivableListQuery =
    (options: AccountsReceivableListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;
        let { page = "1", limit = "10", status, search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.PAGINATION });
        }

        if (status && !Object.values(PaymentStatus).includes(status as PaymentStatus)) {
            return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.INVALID_STATUS });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: ACCOUNTS_RECEIVABLE_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        if (status) req.query.status = status as string;
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

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
