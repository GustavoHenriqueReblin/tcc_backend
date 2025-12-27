import { Request } from "@middleware/auth.middleware";
import { Response } from "express";
import { sendResponse } from "@utils/functions";
import { deliveryAddressService as service } from "@services/services";

export const getAddresses = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const customerId = Number(req.params.customerId);
    const { page = "1", limit = "10", includeInactive, search, sortBy, sortOrder } = req.query;

    const addresses = await service.getAll(
        enterpriseId,
        customerId,
        Number(page),
        Number(limit),
        includeInactive === "true",
        search?.toString(),
        sortBy?.toString(),
        sortOrder?.toString() as "asc" | "desc"
    );
    return sendResponse(res, addresses, "Delivery addresses fetched successfully");
};

export const getAddressById = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const id = Number(req.params.id);

    const address = await service.getById(id, enterpriseId);
    return sendResponse(res, address, "Delivery address fetched successfully");
};

export const createAddress = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;
    const result = await service.create(enterpriseId, req.body, userId);

    return sendResponse(res, result, "Delivery address created successfully");
};

export const updateAddress = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;
    const id = Number(req.params.id);
    const result = await service.update(id, enterpriseId, req.body, userId);

    return sendResponse(res, result, "Delivery address updated successfully");
};
