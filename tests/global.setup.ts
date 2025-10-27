import { request, expect } from "@playwright/test";
import { env } from "../src/config/env";

const globalSetup = async () => {
    const apiContext = await request.newContext();

    const res = await apiContext.post(`http://${env.DOMAIN}:${env.PORT}/api/v1/auth/login`, {
        data: { username: "gustavo", password: "123456" },
    });

    expect(res.ok()).toBeTruthy();
    await apiContext.storageState({ path: "storageState.json" });
    await apiContext.dispose();
};

export default globalSetup;
