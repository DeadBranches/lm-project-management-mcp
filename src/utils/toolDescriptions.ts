import { readFileSync, existsSync } from "fs";
import * as path from "path";

const TOOL_KEYS = ["startsession","loadcontext","deletecontext","buildcontext","advancedcontext","endsession"] as const;
export type ToolKey = typeof TOOL_KEYS[number];

export function loadToolDescriptions(baseDir: string): Record<ToolKey, string> {
  const map = Object.fromEntries(
    TOOL_KEYS.map(k => [k, ""])
  ) as Record<ToolKey, string>;

  for (const tool of TOOL_KEYS) {
    const p = path.resolve(baseDir, `project_${tool}.txt`);
    if (existsSync(p)) {
      map[tool] = readFileSync(p, "utf-8");
    }
  }
  return map;
}
