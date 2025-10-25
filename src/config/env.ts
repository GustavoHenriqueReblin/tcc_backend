import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    DB_HOST: z.string().nonempty(),
    DB_PORT: z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => !isNaN(val) && val > 0, "DB_PORT must be a valid number"),
    DB_USER: z.string().nonempty(),
    DB_PASS: z.string().nonempty(),
    DB_NAME: z.string().nonempty(),

    PORT: z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => !isNaN(val) && val > 0, "PORT must be a valid number")
        .default(3000),

    DATABASE_URL: z.string().url(),

    ENVIRONMENT: z.enum(["DEVELOPMENT", "PRODUCTION"]).default("DEVELOPMENT"),

    APP_SECRET: z.string().min(10, "APP_SECRET must be at least 10 characters long"),
    JWT_EXPIRES_IN: z.string().default("2d"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    if (process.env.ENVIRONMENT === "DEVELOPMENT") console.error("Invalid environment configuration:\n", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
