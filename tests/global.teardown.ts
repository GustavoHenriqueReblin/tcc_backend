import fs from "fs";
import { clearData } from "../prisma/seed";

const globalTeardown = async () => {
    if (fs.existsSync("storageState.json")) fs.unlinkSync("storageState.json");
    if (fs.existsSync("seedData.json")) fs.unlinkSync("seedData.json");
    await clearData();
};

export default globalTeardown;
