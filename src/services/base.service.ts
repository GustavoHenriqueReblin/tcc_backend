import { prisma } from "@config/prisma";

export class BaseService {
    protected prisma = prisma;

    protected async safeQuery<T>(fn: () => Promise<T>, context: string): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            throw error;
        }
    }
}
