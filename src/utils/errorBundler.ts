import { prisma } from "@config/prisma";

export const handleError = async (
    error: unknown,
    context?: string,
    enterpriseId?: number
): Promise<void> => {
    const err = normalizeError(error);

    const formatted = {
        message: err.stack?.slice(0, 1500) ?? "",
        stack: err.name,
        context,
        enterpriseId,
    };

    if (process.env.ENVIRONMENT === "DEVELOPMENT")
        console.error(`[ERROR] ${context ? `[${context}]` : ""} ${err.message}`);

    try {
        await prisma.log.create({ data: formatted });
    } catch (dbErr) {
        console.error("[ERROR] Falha ao salvar log no banco:", dbErr);
    }
};

const normalizeError = (error: unknown): Error => {
    if (error instanceof Error) return error;
    if (typeof error === "string") return new Error(error);
    return new Error("Unknown error");
};
