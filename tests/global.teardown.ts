import fs from "fs";

const globalTeardown = async () => {
    if (fs.existsSync("storageState.json")) fs.unlinkSync("storageState.json");
};

export default globalTeardown;
