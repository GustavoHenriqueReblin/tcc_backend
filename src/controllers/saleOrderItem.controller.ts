import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";
import { SaleOrderItemService } from "@services/saleOrderItem.service";

const service = new SaleOrderItemService();

export const getAllSaleOrderItems = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", saleOrderId } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        saleOrderId ? Number(saleOrderId) : undefined
    );
    return sendResponse(res, result, "Sale order items fetched successfully");
};

export const getSaleOrderItemById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Sale order item fetched successfully");
};

export const createSaleOrderItem = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Sale order item created successfully");
};

export const updateSaleOrderItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Sale order item updated successfully");
};

