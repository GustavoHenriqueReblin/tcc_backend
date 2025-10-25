import { Response } from "express";

export const sendResponse = (res: Response, data: unknown, message = "Success") =>
    res.status(200).json({
        success: true,
        message,
        data,
    });