import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";
import { AssetMaintenanceService } from "@services/assetMaintenance.service";

const service = new AssetMaintenanceService();

export const getAllAssetMaintenances = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", assetId } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        assetId ? Number(assetId) : undefined
    );
    return sendResponse(res, result, "Asset maintenances fetched successfully");
};

export const getAssetMaintenanceById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Asset maintenance fetched successfully");
};

export const createAssetMaintenance = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Asset maintenance created successfully");
};

export const updateAssetMaintenance = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Asset maintenance updated successfully");
};
