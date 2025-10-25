import type { Request as ExpressRequest, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@config/prisma";
import { env } from "@config/env";

interface AuthPayload {
    sub: number;
    username: string;
    role: string;
    enterpriseId: number;
    iat?: number;
    exp?: number;
}

export interface RequestWithAuth extends ExpressRequest {
    auth?: AuthPayload;
}

export const authMiddleware = async (
    req: RequestWithAuth,
    res: Response,
    next: NextFunction
): Promise<Response | void> => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ error: true, message: "Token not provided" });
        }

        const decoded = jwt.verify(token, env.APP_SECRET);
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
            return res.status(401).json({ error: true, message: "Token revoked or expired" });
        }

        req.auth = payload;
        return next();
    } catch {
        return res.status(401).json({ error: true, message: "Invalid or expired token" });
    }
};
