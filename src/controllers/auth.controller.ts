import type { Request, Response } from "express";
import { AuthService } from "@services/auth.service";
import { parseTimeToMs, sendResponse } from "@utils/functions";
import { env } from "@config/env";

const authService = new AuthService();

export const login = async (req: Request, res: Response): Promise<Response> => {
    const { username, password } = req?.body ?? {};

    if (!username || !password) {
        return res.status(400).json({
            error: true,
            message: "Username and password are required",
        });
    }

    const result = await authService.login(username, password);

    if (!result) {
        return res.status(401).json({
            error: true,
            message: "Invalid credentials",
        });
    }

    res.cookie("token", result.token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: parseTimeToMs(env.JWT_EXPIRES_IN),
    });

    return sendResponse(res, result, "Login successful");
};
