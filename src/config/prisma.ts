import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const options: ConstructorParameters<typeof PrismaClient>[0] = undefined;
// env.ENVIRONMENT === "DEVELOPMENT" ? { log: ["query", "info", "warn", "error"] } : undefined;

export const prisma = new PrismaClient(options);
