import type { Response } from "express";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";
import { UnityService } from "@services/unity.service";

const service = new UnityService();

export const getAllUnities = async (req: Request, res: Response) => {
    const { page = "1", limit = "10" } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(enterpriseId, Number(page), Number(limit));
    return sendResponse(res, result, "Unities fetched successfully");
};

export const getUnityById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Unity fetched successfully");
};

export const createUnity = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Unity created successfully");
};

export const updateUnity = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Unity updated successfully");
};

