import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";
import { saleOrderService as service } from "@services/services";
import { OrderStatus } from "@prisma/client";

export const getAllSaleOrders = async (req: Request, res: Response) => {
    const {
        page = "1",
        limit = "10",
        status,
        search,
        sortBy,
        sortOrder,
        customerId,
        createdAtFrom,
        createdAtTo,
    } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        status ? (status as OrderStatus) : undefined,
        search?.toString() ?? undefined,
        sortBy?.toString(),
        (sortOrder?.toString() as "asc" | "desc" | undefined) ?? "desc",
        customerId ? Number(customerId) : undefined,
        createdAtFrom ? new Date(createdAtFrom.toString()) : undefined,
        createdAtTo ? new Date(createdAtTo.toString()) : undefined
    );
    return sendResponse(res, result, "Sale orders fetched successfully");
};

export const getSaleOrderById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Sale order fetched successfully");
};

export const createSaleOrder = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Sale order created successfully");
};

export const updateSaleOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Sale order updated successfully");
};
