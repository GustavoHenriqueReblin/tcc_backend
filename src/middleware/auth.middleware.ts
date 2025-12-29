import type { Request as ExpressRequest, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@config/prisma";

const isProduction = process.env.ENVIRONMENT === "PRODUCTION";
const cookieName = isProduction ? "__Host-erp-access" : "erp-access";
const APP_SECRET = process.env.APP_SECRET ?? "";
const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
} as const;

interface AuthPayload {
    sub: number;
    username: string;
    role: string;
    enterpriseId: number;
    iat?: number;
    exp?: number;
}

export interface Request extends ExpressRequest {
    auth?: AuthPayload;
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> => {
    try {
        const token = req.cookies?.[cookieName];
        if (!token) {
            return res.status(401).json({ error: true, message: "Token not provided" });
        }

        const decoded = jwt.verify(token, APP_SECRET);
        if (typeof decoded === "string" || !("sub" in decoded)) {
            return res.status(401).json({ error: true, message: "Malformed token" });
        }

        const payload: AuthPayload = {
            sub: Number(decoded.sub),
            username: decoded.username as string,
            role: decoded.role as string,
            enterpriseId: Number(decoded.enterpriseId),
            iat: decoded.iat,
            exp: decoded.exp,
        };

        const tokenRecord = await prisma.token.findUnique({ where: { token } });
        if (!tokenRecord || !tokenRecord.valid || tokenRecord.expiresAt < new Date()) {
            res.clearCookie(cookieName, baseCookieOptions);
            return res.status(401).json({ error: true, message: "Token revoked or expired" });
        }

        req.auth = payload;
        return next();
    } catch {
        return res.status(401).json({ error: true, message: "Invalid or expired token" });
    }
};
