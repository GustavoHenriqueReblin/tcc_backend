import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";
import { AssetService } from "@services/asset.service";

const service = new AssetService();

export const getAllAssets = async (req: Request, res: Response) => {
    const { page = "1", limit = "10" } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(enterpriseId, Number(page), Number(limit));
    return sendResponse(res, result, "Assets fetched successfully");
};

export const getAssetById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Asset fetched successfully");
};

export const createAsset = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Asset created successfully");
};

export const updateAsset = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Asset updated successfully");
};
