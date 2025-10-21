import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { KnowledgeGraphManager } from "../../graph/KnowledgeGraphManager.js";
import type { ToolKey } from "../../utils/toolDescriptions.js";
import type { Entity, Relation } from "../../types/graph.js";

type Descriptions = Record<ToolKey, string>;

export function registerBuildContext(server: McpServer, desc: Descriptions, kgm: KnowledgeGraphManager) {
  server.tool(
    "buildcontext",
    desc["buildcontext"],
    {
      type: z.enum(["entities", "relations", "observations"]).describe("Type of creation operation: 'entities', 'relations', or 'observations'"),
      data: z.array(z.any()).describe("Data for the creation operation, structure varies by type but must be an array")
    },
    async ({ type, data }) => {
      try {
        let result;
      
        switch (type) {
          case "entities":
            // Ensure entities match the Entity interface
            const typedEntities: Entity[] = data.map((e: any) => ({
              name: e.name,
              entityType: e.entityType,
              observations: e.observations,
              embedding: e.embedding
            }));
            result = await kgm.createEntities(typedEntities);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ success: true, created: result }, null, 2)
              }]
            };
          
          case "relations":
            // Ensure relations match the Relation interface
            const typedRelations: Relation[] = data.map((r: any) => ({
              from: r.from,
              to: r.to,
              relationType: r.relationType,
              observations: r.observations
            }));
            result = await kgm.createRelations(typedRelations);
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ success: true, created: result }, null, 2)
              }]
            };
          
          case "observations":
            // For project domain, addObservations takes entity name and observations
            for (const item of data) {
              if (item.entityName && Array.isArray(item.contents)) {
                await kgm.addObservations(item.entityName, item.contents);
              }
            }
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ success: true, message: "Added observations to entities" }, null, 2)
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
