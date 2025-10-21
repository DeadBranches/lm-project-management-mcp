import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { KnowledgeGraphManager } from "../../graph/KnowledgeGraphManager.js";
import type { ToolKey } from "../../utils/toolDescriptions.js";
import { loadSessionStates, saveSessionStates } from "../../storage/sessionStore.js";
import type { Relation } from "../../types/graph.js";

type Descriptions = Record<ToolKey, string>;

export function registerDeleteContext(
  server: McpServer,
  desc: Descriptions,
  kgm: KnowledgeGraphManager
) {
  server.tool(
    "deletecontext",
    desc["deletecontext"],
    {
      type: z.enum(["entities", "relations", "observations"]).describe("Type of deletion operation: 'entities', 'relations', or 'observations'"),
      data: z.array(z.any()).describe("Data for the deletion operation, structure varies by type but must be an array")
    },
    async ({ type, data }) => {
      try {
        switch (type) {
          case "entities":
            await kgm.deleteEntities(data);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ success: true, message: `Deleted ${data.length} entities` }, null, 2)
              }]
            };
            
          case "relations":
            // Ensure relations match the Relation interface
            const typedRelations: Relation[] = data.map((r: any) => ({
              from: r.from,
              to: r.to,
              relationType: r.relationType
            }));
            await kgm.deleteRelations(typedRelations);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ success: true, message: `Deleted ${data.length} relations` }, null, 2)
              }]
            };
            
          case "observations":
            // Ensure deletions match the required interface
            const typedDeletions: { entityName: string; observations: string[] }[] = data.map((d: any) => ({
              entityName: d.entityName,
              observations: d.observations
            }));
            await kgm.deleteObservations(typedDeletions);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ success: true, message: `Deleted observations from ${data.length} entities` }, null, 2)
              }]
            };
            
          default:
            throw new Error(`Invalid type: ${type}. Must be 'entities', 'relations', or 'observations'.`);
        }
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ 
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    }
  );
}

