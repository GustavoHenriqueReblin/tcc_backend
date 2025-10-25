import { prisma } from "@config/prisma";
import { handleError } from "@utils/errorBundler";

export class BaseService {
    protected prisma = prisma;

    protected async safeQuery<T>(fn: () => Promise<T>, context: string): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            await handleError(error, context);
            return null;
        }
    }
}