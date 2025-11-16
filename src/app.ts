import express from "express";
import cors from "cors";
import routes from "@routes/index.routes";
import cookieParser from "cookie-parser";
import { testConnection } from "@config/db";
import { errorHandler } from "@middleware/errorHandler";

const app = express();
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json());
app.use("/api/v1", routes);

app.use(errorHandler);

testConnection();

export default app;
