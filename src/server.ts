import app from "./app";
import { startGeoDataCron } from "@cron/updateGeoData";
import { env } from "@config/env";

const PORT = env.PORT;

app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);

    startGeoDataCron();
});
