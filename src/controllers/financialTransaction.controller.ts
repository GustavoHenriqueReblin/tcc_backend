import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";
import { FinancialTransactionService } from "@services/financialTransaction.service";
import { TransactionType } from "@prisma/client";

const service = new FinancialTransactionService();

export const getAllFinancialTransactions = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", type } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        type ? (type as TransactionType) : undefined
    );
    return sendResponse(res, result, "Financial transactions fetched successfully");
};

export const getFinancialTransactionById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Financial transaction fetched successfully");
};

export const createFinancialTransaction = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Financial transaction created successfully");
};

export const updateFinancialTransaction = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Financial transaction updated successfully");
};
