import { defineConfig } from "@playwright/test";

export default defineConfig({
    globalSetup: "./tests/global.setup.ts",
    globalTeardown: "./tests/global.teardown.ts",
    workers: 1,
    fullyParallel: false,
    use: {
        storageState: "storageState.json",
        trace: "off",
        screenshot: "off",
        video: "off",
    },
    outputDir: "/dev/null",
});
