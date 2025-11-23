import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";
import { AssetCategoryService } from "@services/assetCategory.service";

const service = new AssetCategoryService();

export const getAllAssetCategories = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", search, sortBy, sortOrder } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        search?.toString() ?? undefined,
        sortBy?.toString(),
        (sortOrder?.toString() as "asc" | "desc" | undefined) ?? "desc"
    );
    return sendResponse(res, result, "Asset categories fetched successfully");
};

export const getAssetCategoryById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Asset category fetched successfully");
};

export const createAssetCategory = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Asset category created successfully");
};

export const updateAssetCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Asset category updated successfully");
};
