import type { Response } from "express";
import { CustomerService } from "@services/customer.service";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/authMiddleware";

const service = new CustomerService();

export const getAllCustomers = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", includeInactive } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        includeInactive === "true"
    );
    return sendResponse(res, result, "Customers fetched successfully");
};

export const getCustomerById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;

    const result = await service.getById(Number(id), enterpriseId);
    return sendResponse(res, result, "Customer fetched successfully");
};

export const createCustomer = async (req: Request, res: Response) => {
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.create(enterpriseId, req.body, userId);
    return sendResponse(res, result, "Customer created successfully");
};

export const updateCustomer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const enterpriseId = req.auth!.enterpriseId;
    const userId = req.auth!.sub;

    const result = await service.update(Number(id), enterpriseId, req.body, userId);
    return sendResponse(res, result, "Customer updated successfully");
};
