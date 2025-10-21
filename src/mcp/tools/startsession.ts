import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { KnowledgeGraphManager } from "../../graph/KnowledgeGraphManager.js";
import type { ToolKey } from "../../utils/toolDescriptions.js";
import { loadSessionStates, saveSessionStates } from "../../storage/sessionStore.js";
import { generateSessionId } from "../../utils/ids.js";

type Descriptions = Record<ToolKey, string>;

export function registerStartSession(server: McpServer, desc: Descriptions, kgm: KnowledgeGraphManager) {
  server.tool(
    "startsession",
    desc["startsession"],
    {},
    async () => {
        try {
          // Generate a unique session ID
          const sessionId = generateSessionId();
          
          // Get recent sessions from persistent storage instead of entities
          const allSessionStates = await loadSessionStates();

          // Initialize the session state
          allSessionStates.set(sessionId, []);
          await saveSessionStates(allSessionStates);
          
          // Convert sessions map to array and get recent sessions
          const recentSessions = Array.from(allSessionStates.entries())
            .map(([id, stages]) => {
              // Extract summary data from the first stage (if it exists)
              const summaryStage = stages.find(s => s.stage === "summary");
              return {
                id,
                project: summaryStage?.stageData?.project || "Unknown project",
                summary: summaryStage?.stageData?.summary || "No summary available"
              };
            })
            .slice(0, 3); // Default to 3 recent sessions
          
          // Get all projects
          const projectsQuery = await kgm.searchNodes("entityType:project");
          const projects = [];
          
          // Filter for active projects based on has_status relation
          for (const project of projectsQuery.entities) {
            const status = await kgm.getEntityStatus(project.name);
            if (status === "active") {
              projects.push(project);
            }
          }
          
          // Get tasks
          const taskQuery = await kgm.searchNodes("entityType:task");
          const tasks = [];
          
          // Filter for high priority and active tasks
          for (const task of taskQuery.entities) {
            const status = await kgm.getEntityStatus(task.name);
            const priority = await kgm.getEntityPriority(task.name);
            
            if (status === "active" && priority === "high") {
              tasks.push(task);
            }
          }
          
          // Get milestones
          const milestoneQuery = await kgm.searchNodes("entityType:milestone");
          const milestones = [];
          
          // Filter for upcoming milestones
          for (const milestone of milestoneQuery.entities) {
            const status = await kgm.getEntityStatus(milestone.name);
            if (status === "planned" || status === "approaching") {
              milestones.push(milestone);
            }
          }
          
          // Get risks
          const riskQuery = await kgm.searchNodes("entityType:risk");
          const risks = [];
          
          // Filter for high priority risks
          for (const risk of riskQuery.entities) {
            const priority = await kgm.getEntityPriority(risk.name);
            if (priority === "high") {
              risks.push(risk);
            }
          }
          
          // Prepare display text with truncated previews
          const projectsText = await Promise.all(projects.map(async (p) => {
            const status = await kgm.getEntityStatus(p.name) || "Unknown";
            const priority = await kgm.getEntityPriority(p.name);
            const priorityText = priority ? `, Priority: ${priority}` : "";
            
            // Show truncated preview of first observation
            const preview = p.observations.length > 0 
              ? `${p.observations[0].substring(0, 60)}${p.observations[0].length > 60 ? '...' : ''}`
              : "No description";
              
            return `- **${p.name}** (Status: ${status}${priorityText}): ${preview}`;
          }));
          
          const tasksText = await Promise.all(tasks.slice(0, 10).map(async (t) => {
            const status = await kgm.getEntityStatus(t.name) || "Unknown";
            const priority = await kgm.getEntityPriority(t.name) || "Unknown";
            const projectObs = t.observations.find(o => o.startsWith("project:"));
            const project = projectObs ? projectObs.substring(8) : "Unknown project";
            
            // Show truncated preview of first non-project observation
            const nonProjectObs = t.observations.find(o => !o.startsWith("project:"));
            const preview = nonProjectObs 
              ? `${nonProjectObs.substring(0, 60)}${nonProjectObs.length > 60 ? '...' : ''}`
              : "No description";
              
            return `- **${t.name}** (Project: ${project}, Status: ${status}, Priority: ${priority}): ${preview}`;
          }));
          
          const milestonesText = await Promise.all(milestones.slice(0, 8).map(async (m) => {
            const status = await kgm.getEntityStatus(m.name) || "Unknown";
            const projectObs = m.observations.find(o => o.startsWith("project:"));
            const project = projectObs ? projectObs.substring(8) : "Unknown project";
            
            // Show truncated preview of first non-project observation
            const nonProjectObs = m.observations.find(o => !o.startsWith("project:"));
            const preview = nonProjectObs 
              ? `${nonProjectObs.substring(0, 60)}${nonProjectObs.length > 60 ? '...' : ''}`
              : "No description";
              
            return `- **${m.name}** (Project: ${project}, Status: ${status}): ${preview}`;
          }));
          
          const risksText = await Promise.all(risks.slice(0, 5).map(async (r) => {
            const priority = await kgm.getEntityPriority(r.name) || "Unknown";
            const projectObs = r.observations.find(o => o.startsWith("project:"));
            const project = projectObs ? projectObs.substring(8) : "Unknown project";
            
            // Show truncated preview of first non-project observation
            const nonProjectObs = r.observations.find(o => !o.startsWith("project:"));
            const preview = nonProjectObs 
              ? `${nonProjectObs.substring(0, 60)}${nonProjectObs.length > 60 ? '...' : ''}`
              : "No description";
              
            return `- **${r.name}** (Project: ${project}, Priority: ${priority}): ${preview}`;
          }));
          
          const sessionsText = recentSessions.map(s => {
            return `- ${s.project} - ${s.summary.substring(0, 60)}${s.summary.length > 60 ? '...' : ''}`;
          }).join("\n");
          
          return {
            content: [{
              type: "text",
              text: `# Choose what to focus on in this session

## Session ID
\`${sessionId}\`

## Recent Project Management Sessions
${sessionsText || "No recent sessions found."}

## Active Projects
${projectsText.join("\n") || "No active projects found."}

## High-Priority Tasks
${tasksText.join("\n") || "No high-priority tasks found."}

## Upcoming Milestones
${milestonesText.join("\n") || "No upcoming milestones found."}

## Top Project Risks
${risksText.join("\n") || "No high severity risks identified."}

To load specific project context, use the \`loadcontext\` tool with the project name and session ID - ${sessionId}`
            }]
          };
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
