import type { Request, Response, NextFunction } from "express";
import { handleError } from "@utils/errorBundler";
import { RequestWithAuth } from "./authMiddleware";

export const errorHandler = async (
    err: unknown,
    req: RequestWithAuth,
    res: Response,
    _next: NextFunction
): Promise<Response> => {
    const enterpriseId = req.auth?.enterpriseId;

    await handleError(err, `ROUTE:${req.method} ${req.originalUrl}`, enterpriseId);

    return res.status(500).json({
        error: true,
        message: "Internal server error. Please contact support.",
    });
};
