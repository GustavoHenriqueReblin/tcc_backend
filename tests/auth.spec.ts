import { test, expect } from "@playwright/test";

const baseUrl = `http://localhost:${process.env.PORT ?? "3333"}/api/v1`;

test("Busca usuários", async ({ request }) => {
    const res = await request.get(`${baseUrl}/users`);
    expect(res.status()).toBe(200);
});
