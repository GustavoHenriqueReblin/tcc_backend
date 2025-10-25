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
