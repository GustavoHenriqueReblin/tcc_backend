import type { Request, Response } from "express";
import { handleError } from "@utils/errorBundler";

export const errorHandler = async (
    err: unknown,
    req: Request,
    res: Response
): Promise<Response> => {
    await handleError(err, `ROUTE:${req.method} ${req.originalUrl}`);

    return res.status(500).json({
        error: true,
        message: "Internal server error. Please contact support.",
    });
};
