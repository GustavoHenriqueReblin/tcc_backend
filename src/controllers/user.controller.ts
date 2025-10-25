import type { Request, Response } from "express";
import { UserService } from "@services/user.service";
import { sendResponse } from "@utils/functions";

const service = new UserService();

export const getAllUsers = async (_req: Request, res: Response) => {
    const users = await service.getAll();
    return sendResponse(res, users, "Users retrieved successfully");
};

export const createUser = async (req: Request, res: Response) => {
    const user = await service.create(req.body);
    return sendResponse(res, user, "User created successfully");
};
