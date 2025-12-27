import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";
import { purchaseOrderService as service } from "@services/services";
import { OrderStatus } from "@prisma/client";

export const getAllPurchaseOrders = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", status, search, sortBy, sortOrder } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        status ? (status as OrderStatus) : undefined,
        search?.toString() ?? undefined,
        sortBy?.toString(),
        (sortOrder?.toString() as "asc" | "desc" | undefined) ?? "desc"
    );
    return sendResponse(res, result, "Purchase orders fetched successfully");
};

export const getPurchaseOrderById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Purchase order fetched successfully");
};

export const createPurchaseOrder = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Purchase order created successfully");
};

export const updatePurchaseOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Purchase order updated successfully");
};
