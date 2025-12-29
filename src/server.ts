import app from "./app";
import { startGeoDataCron } from "@cron/updateGeoData";
import fs from "node:fs";

const PORT = Number(process.env.PORT ?? "3333");

app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);

    startGeoDataCron();
});
