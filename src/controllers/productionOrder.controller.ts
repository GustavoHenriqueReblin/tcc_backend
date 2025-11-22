import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";
import { ProductionOrderService } from "@services/productionOrder.service";
import { ProductionOrderStatus } from "@prisma/client";

const service = new ProductionOrderService();

export const getAllProductionOrders = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", status, search, sortBy, sortOrder } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        status ? (status as ProductionOrderStatus) : undefined,
        search?.toString() ?? undefined,
        sortBy?.toString(),
        (sortOrder?.toString() as "asc" | "desc" | undefined) ?? "desc"
    );
    return sendResponse(res, result, "Production orders fetched successfully");
};

export const getProductionOrderById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Production order fetched successfully");
};

export const createProductionOrder = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Production order created successfully");
};

export const updateProductionOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Production order updated successfully");
};
