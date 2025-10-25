import type { Request, Response, NextFunction } from "express";
import { handleError } from "@utils/errorBundler";
import { RequestWithAuth } from "./authMiddleware";
import { AppError } from "@utils/appError";

export const errorHandler = async (
    err: unknown,
    req: RequestWithAuth,
    res: Response,
    _next: NextFunction
): Promise<Response> => {
    const enterpriseId = req.auth?.enterpriseId;
    await handleError(err, `ROUTE:${req.method} ${req.originalUrl}`, enterpriseId);

    let message = "Erro interno no servidor.";
    let status = 500;

    if (err instanceof AppError) {
        message = err.message;
        status = err.statusCode;
    }

    return res.status(status).json({
        error: true,
        message,
    });
};
