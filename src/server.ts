import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as path from "path";
import { fileURLToPath } from "url";

import { KnowledgeGraphManager } from "./graph/KnowledgeGraphManager.js";
import { registerAll } from "./mcp/registerTools.js";
import { loadToolDescriptions } from "./utils/toolDescriptions.js";

export async function startServer() {
  const kgm = new KnowledgeGraphManager();
  await kgm.initializeStatusAndPriority();

  const server = new McpServer({ name: "Context Manager", version: "1.0.0" });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const descriptions = loadToolDescriptions(__dirname);

  registerAll(server, descriptions, kgm);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
