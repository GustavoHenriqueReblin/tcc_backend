import fs from "fs";

const globalTeardown = async () => {
    if (fs.existsSync("storageState.json")) fs.unlinkSync("storageState.json");
    if (fs.existsSync("seedData.json")) fs.unlinkSync("seedData.json");
};

export default globalTeardown;
