import cron from "node-cron";
import { prisma } from "@config/prisma";
import axios from "axios";
import { env } from "@config/env";

// Agenda: todo domingo às 03:00 da manhã
const schedule = "0 3 * * 0";

// TO TEST
// const now = new Date();
// const nextMinute = (now.getMinutes() + 1) % 60;
// const currentHour = now.getHours();
// const testSchedule = `${nextMinute} ${currentHour} * * *`;

export const insertGeoData = async () => {
    const API_URL = "https://servicodados.ibge.gov.br/api/v1";

    // País
    const country = await prisma.country.upsert({
        where: { isoCode: "BRA" },
        update: { name: "Brazil" },
        create: { name: "Brazil", isoCode: "BRA" },
    });

    // Estados
    const statesResponse = await axios.get(`${API_URL}/localidades/estados`);
    const states = statesResponse.data;

    for (const s of states) {
        await prisma.state.upsert({
            where: { ibgeCode: s.id },
            update: { name: s.nome, uf: s.sigla, countryId: country.id },
            create: {
                name: s.nome,
                uf: s.sigla,
                ibgeCode: s.id,
                countryId: country.id,
            },
        });
    }

    // Cidades (por estado)
    for (const s of states) {
        const citiesResponse = await axios.get(`${API_URL}/localidades/estados/${s.id}/municipios`);
        const cities = citiesResponse.data;

        const state = await prisma.state.findUnique({ where: { ibgeCode: s.id } });
        if (!state) continue;

        for (const c of cities) {
            await prisma.city.upsert({
                where: { ibgeCode: c.id },
                update: { name: c.nome, stateId: state.id },
                create: { name: c.nome, ibgeCode: c.id, stateId: state.id },
            });
        }

        if (env.ENVIRONMENT === "DEVELOPMENT")
            console.log(`[CRON] ${cities.length} cidades atualizadas para ${s.sigla}`);
    }
};

export const startGeoDataCron = () => {
    cron.schedule(
        schedule,
        async () => {
            if (env.ENVIRONMENT === "DEVELOPMENT")
                console.log("[CRON] Iniciando atualização de países, estados e cidades...");

            try {
                await insertGeoData();
            } catch (error) {
                if (env.ENVIRONMENT === "DEVELOPMENT")
                    console.error("[CRON] Erro ao executar atualização:", error);
            }
        },
        {
            timezone: "America/Sao_Paulo",
        }
    );

    if (env.ENVIRONMENT === "DEVELOPMENT")
        console.log("[CRON] Rotina de atualização geográfica agendada para domingos às 03:00.");
};
