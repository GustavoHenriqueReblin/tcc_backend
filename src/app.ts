import express from "express";
import cors from "cors";
import routes from "@routes/index.routes";
import cookieParser from "cookie-parser";
import { testConnection } from "@config/db";
import { errorHandler } from "@middleware/errorHandler";
import { env } from "@config/env";

const app = express();
const allowedOrigins = [
    `http://${env.DOMAIN}:${env.CLIENT_PORT}`,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://192.168.2.181:5173", // ip local
    "http://192.168.2.181:3000", // ip local
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json());
app.use("/api/v1", routes);
app.use(errorHandler);

testConnection();

export default app;
