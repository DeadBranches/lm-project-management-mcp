import { promises as fs } from "fs";
import { SESSIONS_FILE_PATH } from "../config/paths.js";

export async function loadSessionStates(): Promise<Map<string, any[]>> {
  try {
    const fileContent = await fs.readFile(SESSIONS_FILE_PATH, "utf-8");
    const sessions = JSON.parse(fileContent);
    const sessionsMap = new Map<string, any[]>();
    for (const [key, value] of Object.entries(sessions)) {
      sessionsMap.set(key, value as any[]);
    }
    return sessionsMap;
  } catch (error: any) {
    if (error && error.code === "ENOENT") {
      return new Map<string, any[]>();
    }
    throw error;
  }
}

export async function saveSessionStates(sessionsMap: Map<string, any[]>): Promise<void> {
  const sessions: Record<string, any[]> = {};
  for (const [key, value] of sessionsMap.entries()) {
    sessions[key] = value;
  }
  await fs.writeFile(SESSIONS_FILE_PATH, JSON.stringify(sessions, null, 2), "utf-8");
}
