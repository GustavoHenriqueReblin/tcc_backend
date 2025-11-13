import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";
import { PurchaseOrderItemService } from "@services/purchaseOrderItem.service";

const service = new PurchaseOrderItemService();

export const getAllPurchaseOrderItems = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", purchaseOrderId } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        purchaseOrderId ? Number(purchaseOrderId) : undefined
    );
    return sendResponse(res, result, "Purchase order items fetched successfully");
};

export const getPurchaseOrderItemById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Purchase order item fetched successfully");
};

export const createPurchaseOrderItem = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Purchase order item created successfully");
};

export const updatePurchaseOrderItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Purchase order item updated successfully");
};

