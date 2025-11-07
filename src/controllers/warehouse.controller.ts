import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";
import { WarehouseService } from "@services/warehouse.service";

const service = new WarehouseService();

export const getAllWarehouses = async (req: Request, res: Response) => {
    const { page = "1", limit = "10" } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(enterpriseId, Number(page), Number(limit));
    return sendResponse(res, result, "Warehouses fetched successfully");
};

export const getWarehouseById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Warehouse fetched successfully");
};

export const createWarehouse = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Warehouse created successfully");
};

export const updateWarehouse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Warehouse updated successfully");
};
