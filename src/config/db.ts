import mariadb from "mariadb";
import { env } from "@config/env";

export const pool = mariadb.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    port: env.DB_PORT,
    connectionLimit: 50,
});

export const testConnection = async () => {
    try {
        const conn = await pool.getConnection();
        console.log("Conexão com o MariaDB estabelecida!");
        conn.release();
    } catch (err) {
        console.error("Erro ao conectar ao banco:", err);
    }
};
