import app from "./app";
import dotenv from "dotenv";
import { startGeoDataCron } from "@cron/updateGeoData";

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);

    startGeoDataCron();
});
