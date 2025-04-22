import fs from "fs";
import path from "path";

const USERS_FILE = path.join(__dirname, "../users.json");

function readUserIds() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read users.json:", err);
    return [];
  }
}

function saveUserId(userId: string) {
  const users = readUserIds();
  if (!users.includes(userId)) {
    users.push(userId);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }
}

export { readUserIds, saveUserId };
