import express from "express";
import cors from "cors";
import { testConnection } from "@config/db";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API rodando com sucesso!");
});

// Testar conexão ao iniciar
testConnection();

export default app;
