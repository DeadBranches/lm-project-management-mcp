import * as path from "path";
import { fileURLToPath } from "url";

const parentPath = path.dirname(fileURLToPath(import.meta.url));
const defaultMemoryPath = path.join(parentPath, "memory.json");
const defaultSessionsPath = path.join(parentPath, "sessions.json");

export const MEMORY_FILE_PATH =
  process.env.MEMORY_FILE_PATH
    ? (path.isAbsolute(process.env.MEMORY_FILE_PATH)
        ? process.env.MEMORY_FILE_PATH
        : path.join(process.cwd(), process.env.MEMORY_FILE_PATH))
    : defaultMemoryPath;

export const SESSIONS_FILE_PATH =
  process.env.SESSIONS_FILE_PATH
    ? (path.isAbsolute(process.env.SESSIONS_FILE_PATH)
        ? process.env.SESSIONS_FILE_PATH
        : path.join(process.cwd(), process.env.SESSIONS_FILE_PATH))
    : defaultSessionsPath;
