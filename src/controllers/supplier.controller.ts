import type { Response } from "express";
import { supplierService as service } from "@services/services";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";

export const getAllSuppliers = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", includeInactive, search, sortBy, sortOrder } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        includeInactive === "true",
        search?.toString(),
        sortBy?.toString(),
        sortOrder?.toString() as "asc" | "desc"
    );
    return sendResponse(res, result, "Suppliers fetched successfully");
};

export const getSupplierById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Supplier fetched successfully");
};

export const createSupplier = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Supplier created successfully");
};

export const updateSupplier = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Supplier updated successfully");
};
