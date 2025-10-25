import express from "express";
import cors from "cors";
import { testConnection } from "@config/db";
import { errorHandler } from "@middleware/errorHandler";
import routes from "@routes/index";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/v1", routes);

app.use(errorHandler);

testConnection();

export default app;
