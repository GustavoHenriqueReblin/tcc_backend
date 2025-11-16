import express from "express";
import cors from "cors";
import routes from "@routes/index.routes";
import cookieParser from "cookie-parser";
import { testConnection } from "@config/db";
import { errorHandler } from "@middleware/errorHandler";
import { env } from "@config/env";

const app = express();
app.use(
    cors({
        origin: `http://${env.DOMAIN}:${env.CLIENT_PORT}`,
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json());
app.use("/api/v1", routes);

app.use(errorHandler);

testConnection();

export default app;
