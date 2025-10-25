import { Response } from "express";

export const sendResponse = (res: Response, data: unknown, message = "Success") =>
    res.status(200).json({
        success: true,
        message,
        data,
    });

/**
 * Converte tempo tipo "1d", "2h", "30m", "10s" em milissegundos.
 * Exemplo: "1d" → 86400000
 */
export const parseTimeToMs = (value: string): number => {
    const match = value.match(/^(\d+)([smhd])$/i);
    if (!match) {
        throw new Error(`Invalid time format: ${value}`);
    }

    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case "s":
            return amount * 1000;
        case "m":
            return amount * 60 * 1000;
        case "h":
            return amount * 60 * 60 * 1000;
        case "d":
            return amount * 24 * 60 * 60 * 1000;
        default:
            throw new Error(`Unknown time unit: ${unit}`);
    }
};
