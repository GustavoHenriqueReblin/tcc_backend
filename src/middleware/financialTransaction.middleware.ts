import { TransactionType } from "@prisma/client";
import { FinancialTransactionInput } from "@services/financialTransaction.service";
import { Request, Response, NextFunction } from "express";

export const FINANCIAL_TRANSACTION_ERROR = {
    PAGINATION: "page and limit must be numbers",
    INVALID_TYPE: "type must be a valid TransactionType",
    MISSING_FIELDS: "Required fields not provided",
    WRONG_FIELD_VALUE: "Fields submitted with invalid values",
};

export const validateFinancialTransactionPaginationAndFilter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { page = "1", limit = "10", type } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (Number.isNaN(pageNum) || Number.isNaN(limitNum)) {
        return res.status(400).json({ message: FINANCIAL_TRANSACTION_ERROR.PAGINATION });
    }

    if (type && !Object.values(TransactionType).includes(type as TransactionType)) {
        return res.status(400).json({ message: FINANCIAL_TRANSACTION_ERROR.INVALID_TYPE });
    }

    req.query.page = pageNum.toString();
    req.query.limit = limitNum.toString();
    if (type) req.query.type = type as string;

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
