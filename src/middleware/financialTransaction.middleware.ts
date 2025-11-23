import { TransactionType } from "@prisma/client";
import { FinancialTransactionInput } from "@services/financialTransaction.service";
import { Request, Response, NextFunction } from "express";

export const FINANCIAL_TRANSACTION_ERROR = {
    ID: "Invalid Id parameter",
    PAGINATION: "page and limit must be numbers",
    INVALID_TYPE: "type must be a valid TransactionType",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
    SEARCH: "search filter is not allowed for this resource",
    SORT: "sortOrder must be 'asc' or 'desc'",
    SORT_BY: "Invalid sortBy field",
};

export interface FinancialTransactionListQueryOptions {
    allowedSortFields?: string[];
}

export const validateFinancialTransactionQuery = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: FINANCIAL_TRANSACTION_ERROR.ID });
    }

    next();
};

export const validateFinancialTransactionListQuery =
    (options: FinancialTransactionListQueryOptions = {}) =>
    (req: Request, res: Response, next: NextFunction) => {
        const { allowedSortFields = [] } = options;
        let { page = "1", limit = "10", type, search, sortBy, sortOrder } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
            return res.status(400).json({ message: FINANCIAL_TRANSACTION_ERROR.PAGINATION });
        }

        if (type && !Object.values(TransactionType).includes(type as TransactionType)) {
            return res.status(400).json({ message: FINANCIAL_TRANSACTION_ERROR.INVALID_TYPE });
        }

        if (typeof search === "string") {
            search = search.trim();
            if (search.length === 0) search = undefined;
        }

        if (sortBy && !allowedSortFields.includes(sortBy.toString())) {
            return res.status(400).json({ message: FINANCIAL_TRANSACTION_ERROR.SORT_BY });
        }

        if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
            return res.status(400).json({ message: FINANCIAL_TRANSACTION_ERROR.SORT });
        }

        req.query.page = pageNum.toString();
        req.query.limit = limitNum.toString();
        if (type) req.query.type = type as string;
        req.query.search = search?.toString();
        req.query.sortBy = sortBy?.toString();
        req.query.sortOrder = sortOrder?.toString() || "desc";

        next();
    };

export const validateFinancialTransactionFields = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const transaction = req.body as FinancialTransactionInput;

    if (!transaction || transaction.value === undefined || !transaction.type) {
        return res.status(400).json({ message: FINANCIAL_TRANSACTION_ERROR.MISSING_FIELDS });
    }

    if (
        transaction.type &&
        !Object.values(TransactionType).includes(transaction.type as TransactionType)
    ) {
        return res.status(400).json({ message: FINANCIAL_TRANSACTION_ERROR.WRONG_FIELD_VALUE });
    }

    next();
};
