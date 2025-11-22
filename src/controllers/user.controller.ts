import type { Response } from "express";
import { UserService } from "@services/user.service";
import { sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";

const service = new UserService();

export const getAllUsers = async (req: Request, res: Response) => {
    const { page = "1", limit = "10", includeInactive, search, sortBy, sortOrder } = req.query;
    const enterpriseId = req.auth!.enterpriseId;

    const users = await service.getAll(
        enterpriseId,
        Number(page),
        Number(limit),
        includeInactive === "true",
        search?.toString(),
        sortBy?.toString(),
        sortOrder?.toString() as "asc" | "desc"
    );
    return sendResponse(res, users, "Users retrieved successfully");
};

export const createUser = async (req: Request, res: Response) => {
    const user = await service.create(req.body);
    return sendResponse(res, user, "User created successfully");
};
