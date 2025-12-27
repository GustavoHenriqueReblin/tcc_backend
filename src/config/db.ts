import mariadb from "mariadb";

export const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
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
