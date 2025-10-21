import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { KnowledgeGraphManager } from "../graph/KnowledgeGraphManager.js";

export function registerGraphResource(server: McpServer, kgm: KnowledgeGraphManager) {
  server.resource("graph", "graph://project", async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(await kgm.readGraph(), null, 2)
      }
    ]
  }));
}
