import app from "./app";
import { startGeoDataCron } from "@cron/updateGeoData";
import fs from "node:fs";

const PORT = Number(process.env.PORT ?? "3333");

app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);

    const CHROMIUM_PATHS = [
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome",
        "/app/node_modules/playwright-core/.local-browsers",
    ];

    for (const path of CHROMIUM_PATHS) {
        try {
            const exists = fs.existsSync(path);
            console.log(`[PDF][Chromium] ${path} exists:`, exists);
            if (exists) {
                const stat = fs.statSync(path);
                console.log(`[PDF][Chromium] ${path} isFile:`, stat.isFile());
            }
        } catch (err) {
            console.log(`[PDF][Chromium] error checking ${path}`, err);
        }
    }

    startGeoDataCron();
});
