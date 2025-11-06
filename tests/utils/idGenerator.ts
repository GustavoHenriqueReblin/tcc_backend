import fs from "fs";

let currentId: number;

try {
    const { lastId } = JSON.parse(fs.readFileSync("seedData.json", "utf-8"));
    currentId = lastId;
} catch {
    currentId = -1;
}

export const genId = () => currentId--;
