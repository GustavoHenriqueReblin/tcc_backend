import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";
import { ProductionOrderInputService } from "@services/productionOrderInput.service";

const service = new ProductionOrderInputService();

export const getAllProductionOrderInputs = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", productionOrderId } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        productionOrderId ? Number(productionOrderId) : undefined
    );
    return sendResponse(res, result, "Production order inputs fetched successfully");
};

export const getProductionOrderInputById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Production order input fetched successfully");
};

export const createProductionOrderInput = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Production order input created successfully");
};

export const updateProductionOrderInput = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Production order input updated successfully");
};

