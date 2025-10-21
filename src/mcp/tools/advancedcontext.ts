import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { KnowledgeGraphManager } from "../../graph/KnowledgeGraphManager.js";
import type { ToolKey } from "../../utils/toolDescriptions.js";

type Descriptions = Record<ToolKey, string>;

export function registerAdvancedContext(server: McpServer, desc: Descriptions, kgm: KnowledgeGraphManager) {
  server.tool(
    "advancedcontext",
    desc["advancedcontext"],
    {
        type: z.enum([
          "graph", 
          "search", 
          "nodes", 
          "project", 
          "dependencies", 
          "assignments", 
          "milestones", 
          "timeline", 
          "resources", 
          "risks", 
          "related", 
          "decisions", 
          "health"
        ]).describe("Type of get operation"),
        params: z.record(z.string(), z.any()).describe("Parameters for the get operation, structure varies by type")
      },
      async ({ type, params }) => {
        try {
          let result;
          
          switch (type) {
            case "graph":
              result = await kgm.readGraph();
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, graph: result }, null, 2)
                }]
              };
              
            case "search":
              result = await kgm.searchNodes(params.query);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, results: result }, null, 2)
                }]
              };
              
            case "nodes":
              result = await kgm.openNodes(params.names);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, nodes: result }, null, 2)
                }]
              };
              
            case "project":
              result = await kgm.getProjectOverview(params.projectName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, project: result }, null, 2)
                }]
              };
              
            case "dependencies":
              result = await kgm.getTaskDependencies(
                params.taskName,
                params.depth || 2
              );
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, dependencies: result }, null, 2)
                }]
              };
              
            case "assignments":
              result = await kgm.getTeamMemberAssignments(params.teamMemberName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, assignments: result }, null, 2)
                }]
              };
              
            case "milestones":
              result = await kgm.getMilestoneProgress(
                params.projectName,
                params.milestoneName
              );
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, milestones: result }, null, 2)
                }]
              };
              
            case "timeline":
              result = await kgm.getProjectTimeline(params.projectName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, timeline: result }, null, 2)
                }]
              };
              
            case "resources":
              result = await kgm.getResourceAllocation(
                params.projectName,
                params.resourceName
              );
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, resources: result }, null, 2)
                }]
              };
              
            case "risks":
              result = await kgm.getProjectRisks(params.projectName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, risks: result }, null, 2)
                }]
              };
              
            case "related":
              result = await kgm.findRelatedProjects(
                params.projectName,
                params.depth || 1
              );
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, relatedProjects: result }, null, 2)
                }]
              };
              
            case "decisions":
              result = await kgm.getDecisionLog(params.projectName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, decisions: result }, null, 2)
                }]
              };
              
            case "health":
              result = await kgm.getProjectHealth(params.projectName);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({ success: true, health: result }, null, 2)
                }]
              };
              
            default:
              throw new Error(`Invalid type: ${type}. Must be one of the supported get operation types.`);
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
