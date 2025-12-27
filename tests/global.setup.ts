import { request, expect } from "@playwright/test";
import { defaultUser } from "../src/config/default.data";

const baseUrl = "http://localhost:3333/api/v1";

const globalSetup = async () => {
    const apiContext = await request.newContext();

    const res = await apiContext.post(`${baseUrl}/auth/login`, {
        data: { username: defaultUser.username(), password: defaultUser.password },
    });

    expect(res.ok()).toBeTruthy();
    await apiContext.storageState({ path: "storageState.json" });
    await apiContext.dispose();
};

export default globalSetup;
