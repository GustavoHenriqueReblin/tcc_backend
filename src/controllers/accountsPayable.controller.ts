import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";
import { AccountsPayableService } from "@services/accountsPayable.service";
import { PaymentStatus } from "@prisma/client";

const service = new AccountsPayableService();

export const getAllAccountsPayable = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", status } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        status ? (status as PaymentStatus) : undefined
    );
    return sendResponse(res, result, "Accounts payable fetched successfully");
};

export const getAccountsPayableById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Accounts payable fetched successfully");
};

export const createAccountsPayable = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Accounts payable created successfully");
};

export const updateAccountsPayable = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Accounts payable updated successfully");
};
