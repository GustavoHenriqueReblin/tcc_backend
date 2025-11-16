import type { Response } from "express";
import { AuthService } from "@services/auth.service";
import { parseTimeToMs, sendResponse } from "@utils/functions";
import { env } from "@config/env";
import { Request } from "@middleware/authMiddleware";

const service = new AuthService();

export const login = async (req: Request, res: Response): Promise<Response> => {
    const { username, password } = req?.body ?? {};

    if (!username || !password) {
        return res.status(400).json({
            error: true,
            message: "Username and password are required",
        });
    }

    const result = await service.login(username, password);

    if (!result) {
        return res.status(401).json({
            error: true,
            message: "Invalid credentials",
        });
    }

    res.cookie("__Host-erp-access", result.token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: parseTimeToMs(env.JWT_EXPIRES_IN),
    });

    const { token, ...data } = result;
    return sendResponse(res, data, "Login successful");
};

export const logout = async (req: Request, res: Response) => {
    const token = req.cookies?.token as string;
    if (!token) return res.status(401).json({ error: true, message: "Token não fornecido" });

    const result = await service.logout(token);

    res.clearCookie("__Host-erp-access", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
    });

    return sendResponse(res, result, "Logout successful");
};
