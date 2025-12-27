import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";

const baseUrl = `http://localhost:${env.PORT}/api/v1`;

test("Busca usuários", async ({ request }) => {
    const res = await request.get(`${baseUrl}/users`);
    expect(res.status()).toBe(200);
});
