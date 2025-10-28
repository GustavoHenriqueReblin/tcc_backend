import { request, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { defaultUser } from "../src/config/default.data";

const globalSetup = async () => {
    const apiContext = await request.newContext();

    const res = await apiContext.post(`http://${env.DOMAIN}:${env.PORT}/api/v1/auth/login`, {
        data: { username: defaultUser.username, password: defaultUser.password },
    });

    expect(res.ok()).toBeTruthy();
    await apiContext.storageState({ path: "storageState.json" });
    await apiContext.dispose();
};

export default globalSetup;
