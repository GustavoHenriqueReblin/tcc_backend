import { env } from "@config/env";
import { prisma } from "@config/prisma";

export class AppError extends Error {
    public readonly context?: string;
    public readonly original?: unknown;

    constructor(message: string, context?: string, original?: unknown) {
        super(message);
        this.context = context;
        this.original = original;
    }
}

export const handleError = async (error: unknown, context?: string): Promise<void> => {
    const err = normalizeError(error);

    const formatted = {
        message: err.message,
        stack: err.stack ? err.stack.substring(0, 5000) : null,
        context,
    };

    if (env.ENVIRONMENT === "DEVELOPMENT") console.error(`[ERROR] ${context ? `[${context}]` : ""} ${err.message}`);
    if (err.stack && env.ENVIRONMENT === "DEVELOPMENT") console.error(err.stack);

    try {
        await prisma.log.create({ data: formatted });
    } catch (dbErr: unknown) {
        if (env.ENVIRONMENT === "DEVELOPMENT") console.error("[ERROR] Falha ao salvar log no banco:", dbErr);
    }
};

const normalizeError = (error: unknown): Error => {
    if (error instanceof Error) return error;
    if (typeof error === "string") return new Error(error);
    return new Error("Unknown error");
};
