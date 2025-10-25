import express from "express";
import cors from "cors";
import { testConnection } from "@config/db";
import { errorHandler } from "@middleware/errorHandler";

const app = express();
app.use(cors());
app.use(express.json());
app.use(errorHandler);

app.get("/", (req, res) => {
    res.send("API rodando com sucesso!");
});

// Testar conexão ao iniciar
testConnection();

export default app;
