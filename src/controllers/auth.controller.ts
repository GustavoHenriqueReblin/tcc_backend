import type { Response } from "express";
import { authService as service } from "@services/services";
import { parseTimeToMs, sendResponse } from "@utils/functions";
import { Request } from "@middleware/auth.middleware";
import { prisma } from "@config/prisma";

const isProduction = process.env.ENVIRONMENT === "PRODUCTION";
const cookieName = isProduction ? "__Host-erp-access" : "erp-access";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "2d";
const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
} as const;

export const me = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (!req.auth) {
            res.clearCookie(cookieName, baseCookieOptions);

            return res.status(401).json({
                error: true,
                message: "Not authenticated",
            });
        }

        const token = req.cookies?.[cookieName];
        const userId = req.auth.sub;

        if (token) {
            const expiresInMs = parseTimeToMs(JWT_EXPIRES_IN);
            const expiresAt = new Date(Date.now() + expiresInMs);

            const { count } = await prisma.token.updateMany({
                where: { token, valid: true },
                data: { expiresAt },
            });

            if (count > 0) {
                res.cookie(cookieName, token, {
                    ...baseCookieOptions,
                    maxAge: expiresInMs,
                });
            }
        }

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

    res.cookie(cookieName, result.token, {
        ...baseCookieOptions,
        maxAge: parseTimeToMs(JWT_EXPIRES_IN),
    });

    const { token, ...data } = result;
    return sendResponse(res, data, "Login successful");
};

export const logout = async (req: Request, res: Response) => {
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ error: true, message: "Token não fornecido" });

    const result = await service.logout(token);

    res.clearCookie(cookieName, baseCookieOptions);

    return sendResponse(res, result, "Logout successful");
};
