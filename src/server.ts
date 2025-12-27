import app from "./app";
import { startGeoDataCron } from "@cron/updateGeoData";

const PORT = Number(process.env.PORT ?? "3333");

app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);

    startGeoDataCron();
});
