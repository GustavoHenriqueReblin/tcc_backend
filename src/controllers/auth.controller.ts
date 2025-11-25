import type { Response } from "express";
import { AuthService } from "@services/auth.service";
import { parseTimeToMs, sendResponse } from "@utils/functions";
import { env } from "@config/env";
import { Request } from "@middleware/auth.middleware";
import { prisma } from "@config/prisma";

const service = new AuthService();

export const me = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.auth) {
            res.clearCookie("__Host-erp-access", {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
            });

            return res.status(401).json({
                error: true,
                message: "Not authenticated",
            });
        }

        const userId = req.auth.sub;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                enterpriseId: true,
                personId: true,

                person: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        taxId: true,
                        city: {
                            select: {
                                name: true,
                                state: { select: { uf: true } },
                            },
                        },
                    },
                },

                enterprise: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return res.json({
            success: true,
            message: "Authenticated",
            data: {
                token: req.auth,
                user,
            },
        });
    } catch (err) {
        console.error("ME ERROR:", err);

        return res.status(500).json({
            error: true,
            message: "Internal server error",
        });
    }
};

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
    const token = req.cookies?.["__Host-erp-access"];
    if (!token) return res.status(401).json({ error: true, message: "Token não fornecido" });

    const result = await service.logout(token);

    res.clearCookie("__Host-erp-access", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
    });

    return sendResponse(res, result, "Logout successful");
};
