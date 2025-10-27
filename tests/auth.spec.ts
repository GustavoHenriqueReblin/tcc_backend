import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";

test("Busca usuários", async ({ request }) => {
    const res = await request.get(`http://${env.DOMAIN}:${env.PORT}/api/v1/users`);
    expect(res.status()).toBe(200);
});
