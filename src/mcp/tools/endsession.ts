import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { KnowledgeGraphManager } from "../../graph/KnowledgeGraphManager.js";
import type { ToolKey } from "../../utils/toolDescriptions.js";
import { loadSessionStates, saveSessionStates } from "../../storage/sessionStore.js";
import { processStage } from "../stages.js";

type Descriptions = Record<ToolKey, string>;

export function registerEndSession(server: McpServer, desc: Descriptions, kgm: KnowledgeGraphManager) {
  server.tool(
    "endsession",
    desc["endsession"],
    {
      sessionId: z.string().describe("The unique session identifier obtained from startsession"),
      stage: z.string().describe("Current stage of analysis: 'summary', 'milestones', 'risks', 'tasks', 'teamUpdates', or 'assembly'"),
      stageNumber: z.number().int().positive().describe("The sequence number of the current stage (starts at 1)"),
      totalStages: z.number().int().positive().describe("Total number of stages in the workflow (typically 6 for standard workflow)"),
      analysis: z.string().optional().describe("Text analysis or observations for the current stage"),
      stageData: z.record(z.string(), z.any()).optional().describe(`Stage-specific data structure - format depends on the stage type:
      - For 'summary' stage: { summary: "Session summary text", duration: "4 hours", project: "Project Name" }
      - For 'milestones' stage: { milestones: [{ name: "Milestone1", status: "completed", notes: "Notes about completion" }] }
      - For 'risks' stage: { risks: [{ name: "Risk1", severity: "high", mitigation: "Plan to address this risk" }] }
      - For 'tasks' stage: { tasks: [{ name: "Task1", status: "in_progress", assignee: "Team Member", notes: "Status update" }] }
      - For 'teamUpdates' stage: { teamUpdates: [{ member: "Team Member", status: "Completed assigned tasks", blockers: "None" }] }
      - For 'assembly' stage: no stageData needed - automatic assembly of previous stages`),
      nextStageNeeded: z.boolean().describe("Whether additional stages are needed after this one (false for final stage)"),
      isRevision: z.boolean().optional().describe("Whether this is revising a previous stage"),
      revisesStage: z.number().int().positive().optional().describe("If revising, which stage number is being revised")
    },
    async (params, extra) => {
      try {
        // Load session states from persistent storage
        const sessionStates = await loadSessionStates();
      
        // Validate session ID
        if (!sessionStates.has(params.sessionId)) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ 
                success: false,
                error: `Session with ID ${params.sessionId} not found. Please start a new session with startsession.`
              }, null, 2)
            }]
          };
        }
      
        // Get or initialize session state
        let sessionState = sessionStates.get(params.sessionId) || [];
      
        // Process the current stage
        const stageResult = await processStage(params, sessionState);
      
        // Store updated state
        if (params.isRevision && params.revisesStage) {
          // Find the analysis stages in the session state
          const analysisStages = sessionState.filter(item => item.type === 'analysis_stage') || [];
        
          if (params.revisesStage <= analysisStages.length) {
            // Replace the revised stage
            analysisStages[params.revisesStage - 1] = {
              type: 'analysis_stage',
              ...stageResult
            };
          } else {
            // Add as a new stage
            analysisStages.push({
              type: 'analysis_stage',
              ...stageResult
            });
          }
        
          // Update the session state with the modified analysis stages
          sessionState = [
            ...sessionState.filter(item => item.type !== 'analysis_stage'),
            ...analysisStages
          ];
        } else {
          // Add new stage
          sessionState.push({
            type: 'analysis_stage',
            ...stageResult
          });
        }
      
        // Update in persistent storage
        sessionStates.set(params.sessionId, sessionState);
        await saveSessionStates(sessionStates);
      
        // Check if this is the final assembly stage and no more stages are needed
        if (params.stage === "assembly" && !params.nextStageNeeded) {
          // Get the assembled arguments
          const args = stageResult.stageData;
        
          try {
            // Parse arguments
            const summary = args.summary;
            const duration = args.duration;
            const project = args.project;
            const achievements = args.achievements ? JSON.parse(args.achievements) : [];
            const taskUpdates = args.taskUpdates ? JSON.parse(args.taskUpdates) : [];
            const projectStatus = args.projectStatus;
            const projectObservation = args.projectObservation;
            const newTasks = args.newTasks ? JSON.parse(args.newTasks) : [];
            const riskUpdates = args.riskUpdates ? JSON.parse(args.riskUpdates) : [];
          
            // Create a timestamp to use for entity naming
            const timestamp = new Date().getTime().toString();
          
            // Create achievement entities and link them to the project
            const achievementEntities = await Promise.all(achievements.map(async (achievement: string, index: number) => {
              const achievementName = `achievement_${timestamp}_${index}`;
              await kgm.createEntities([{
                name: achievementName,
                entityType: 'decision',
                observations: [achievement],
                embedding: undefined
              }]);
            
              await kgm.createRelations([{
                from: achievementName,
                to: project,
                relationType: 'part_of',
                observations: []
              }]);
            
              return achievementName;
            }));
          
            // Update task statuses using entity-relation approach
            await Promise.all(taskUpdates.map(async (taskUpdate: {name: string, status: string, progress?: string}) => {
              try {
                // Map task status to standard values
                let standardStatus = taskUpdate.status;
                if (taskUpdate.status === 'completed' || taskUpdate.status === 'done' || taskUpdate.status === 'finished') {
                  standardStatus = 'completed';
                } else if (taskUpdate.status === 'in_progress' || taskUpdate.status === 'ongoing' || taskUpdate.status === 'started') {
                  standardStatus = 'active';
                } else if (taskUpdate.status === 'not_started' || taskUpdate.status === 'planned' || taskUpdate.status === 'upcoming') {
                  standardStatus = 'inactive';
                }
              
                // Update the task status using the entity-relation approach
                await kgm.setEntityStatus(taskUpdate.name, standardStatus);
              
                // If the task is completed, link it to the current session
                if (standardStatus === 'completed') {
                  await kgm.createRelations([{
                    from: params.sessionId,
                    to: taskUpdate.name,
                    relationType: 'resolves',
                    observations: []
                  }]);
                }
              
                // Add progress as an observation if provided
                if (taskUpdate.progress) {
                  await kgm.addObservations(taskUpdate.name, [`Progress: ${taskUpdate.progress}`]);
                }
              } catch (error) {
                console.error(`Error updating task ${taskUpdate.name}: ${error}`);
              }
            }));
          
            // Update project status if specified
            if (project && projectStatus) {
              try {
                // Map project status to standard values
                let standardStatus = projectStatus;
                if (projectStatus === 'completed' || projectStatus === 'done' || projectStatus === 'finished') {
                  standardStatus = 'completed';
                } else if (projectStatus === 'in_progress' || projectStatus === 'ongoing' || projectStatus === 'active') {
                  standardStatus = 'active';
                } else if (projectStatus === 'not_started' || projectStatus === 'planned' || projectStatus === 'upcoming') {
                  standardStatus = 'inactive';
                }
              
                // Update the project status using the entity-relation approach
                await kgm.setEntityStatus(project, standardStatus);
              
                // Add project observation if provided
                if (projectObservation) {
                  await kgm.addObservations(project, [projectObservation]);
                }
              } catch (error) {
                console.error(`Error updating project ${project}: ${error}`);
              }
            }
          
            // Create new tasks with specified attributes
            const newTaskEntities = await Promise.all(newTasks.map(async (task: {name: string, description: string, priority: string, precedes?: string, follows?: string}) => {
              try {
                // Create the task entity
                await kgm.createEntities([{
                  name: task.name,
                  entityType: 'task',
                  observations: [
                    task.description ? `Description: ${task.description}` : 'No description'
                  ],
                  embedding: undefined
                }]);
              
                // Set task priority using entity-relation approach
                const priority = task.priority || 'N/A';
                await kgm.setEntityPriority(task.name, priority);
              
                // Set task status to active by default using entity-relation approach
                await kgm.setEntityStatus(task.name, 'active');
              
                // Link the task to the project
                await kgm.createRelations([{
                  from: task.name,
                  to: project,
                  relationType: 'part_of',
                  observations: []
                }]);
              
                // Handle task sequencing if specified
                if (task.precedes) {
                  await kgm.createRelations([{
                    from: task.name,
                    to: task.precedes,
                    relationType: 'precedes',
                    observations: []
                  }]);
                }
              
                if (task.follows) {
                  await kgm.createRelations([{
                    from: task.follows,
                    to: task.name,
                    relationType: 'precedes',
                    observations: []
                  }]);
                }
              
                return task.name;
              } catch (error) {
                console.error(`Error creating task ${task.name}: ${error}`);
                return null;
              }
            }));
          
            // Process risk updates
            await Promise.all(riskUpdates.map(async (risk: {name: string, status: string, impact: string, probability: string}) => {
              try {
                // Try to find the risk entity, create it if it doesn't exist
                const riskEntity = (await kgm.openNodes([risk.name])).entities
                  .find(e => e.name === risk.name && e.entityType === 'risk');
              
                if (!riskEntity) {
                  // Create new risk entity
                  await kgm.createEntities([{
                    name: risk.name,
                    entityType: 'risk',
                    observations: [],
                    embedding: undefined
                  }]);
                
                  // Link it to the project
                  await kgm.createRelations([{
                    from: risk.name,
                    to: project,
                    relationType: 'part_of',
                    observations: []
                  }]);
                }
              
                // Update risk status using entity-relation approach
                await kgm.setEntityStatus(risk.name, risk.status);
              
                // Add risk observation if provided
                if (risk.impact) {
                  await kgm.addObservations(risk.name, [`Impact: ${risk.impact}`, `Probability: ${risk.probability}`]);
                }
              } catch (error) {
                console.error(`Error updating risk ${risk.name}: ${error}`);
              }
            }));
          
            // Record session completion in persistent storage
            sessionState.push({
              type: 'session_completed',
              timestamp: new Date().toISOString(),
              summary: summary,
              project: project
            });
          
            sessionStates.set(params.sessionId, sessionState);
            await saveSessionStates(sessionStates);
          
            // Prepare the summary message
            const summaryMessage = `# Project Session Recorded

  I've recorded your project session focusing on ${project}.

  ## Decisions Documented
  ${achievements.map((a: string) => `- ${a}`).join('\n') || "No decisions recorded."}

  ## Task Updates
  ${taskUpdates.map((t: {name: string, status: string, progress?: string}) => 
    `- ${t.name}: ${t.status}${t.progress ? ` (Progress: ${t.progress})` : ''}`
  ).join('\n') || "No task updates."}

  ## Project Status
  Project ${project} has been updated to: ${projectStatus}

  ${newTasks && newTasks.length > 0 ? `## New Tasks Added
  ${newTasks.map((t: {name: string, description: string, priority: string}) => 
    `- ${t.name}: ${t.description} (Priority: ${t.priority || "N/A"})`
  ).join('\n')}` : "No new tasks added."}

  ${riskUpdates && riskUpdates.length > 0 ? `## Risk Updates
  ${riskUpdates.map((r: {name: string, status: string, impact: string, probability: string}) => 
    `- ${r.name}: Status ${r.status} (Impact: ${r.impact}, Probability: ${r.probability})`
  ).join('\n')}` : "No risk updates."}

  ## Session Summary
  ${summary}

  Would you like me to perform any additional updates to your project knowledge graph?`;
          
            // Return the final result with the session recorded message
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: true,
                  stageCompleted: params.stage,
                  nextStageNeeded: false,
                  stageResult: stageResult,
                  sessionRecorded: true,
                  summaryMessage: summaryMessage
                }, null, 2)
              }]
            };
          } catch (error) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: `Error recording project session: ${error instanceof Error ? error.message : String(error)}`
                }, null, 2)
              }]
            };
          }
        } else {
          // This is not the final stage or more stages are needed
          // Return intermediate result
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                stageCompleted: params.stage,
                nextStageNeeded: params.nextStageNeeded,
                stageResult: stageResult,
                endSessionArgs: params.stage === "assembly" ? stageResult.stageData : null
              }, null, 2)
            }]
          };
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
