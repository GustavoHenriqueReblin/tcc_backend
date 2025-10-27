import { env } from "@config/env";
import { prisma } from "@config/prisma";

export const handleError = async (
    error: unknown,
    context?: string,
    enterpriseId?: number
): Promise<void> => {
    const err = normalizeError(error);

    const formatted = {
        message: err.message,
        stack: err.stack?.slice(0, 1500) ?? null,
        context,
        enterpriseId,
    };

    if (env.ENVIRONMENT === "DEVELOPMENT")
        console.error(`[ERROR] ${context ? `[${context}]` : ""} ${err.message}`);
    if (err.stack && env.ENVIRONMENT === "DEVELOPMENT") console.error(err.stack);

    try {
        await prisma.log.create({ data: formatted });
    } catch (dbErr) {
        if (env.ENVIRONMENT === "DEVELOPMENT")
            console.error("[ERROR] Falha ao salvar log no banco:", dbErr);
    }
};

const normalizeError = (error: unknown): Error => {
    if (error instanceof Error) return error;
    if (typeof error === "string") return new Error(error);
    return new Error("Unknown error");
};
