import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "@routes/index.routes";
import cookieParser from "cookie-parser";
import { testConnection } from "@config/db";
import { errorHandler } from "@middleware/errorHandler";

const app = express();

const isProduction = process.env.ENVIRONMENT === "PRODUCTION";
const localNetworkRegex =
    /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            if (!isProduction && localNetworkRegex.test(origin)) {
                return callback(null, true);
            }

            if (isProduction && origin === (process.env.CLIENT_URL ?? "http://localhost:5173")) {
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
