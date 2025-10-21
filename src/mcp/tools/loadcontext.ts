import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { KnowledgeGraphManager } from "../../graph/KnowledgeGraphManager.js";
import type { ToolKey } from "../../utils/toolDescriptions.js";
import { loadSessionStates, saveSessionStates } from "../../storage/sessionStore.js";
import type { Entity } from "../../types/graph.js";

type Descriptions = Record<ToolKey, string>;

export function registerLoadContext(server: McpServer, desc: Descriptions, kgm: KnowledgeGraphManager) {
  server.tool(
    "loadcontext",
    desc["loadcontext"],
    {
        entityName: z.string(),
        entityType: z.string().optional(),
        sessionId: z.string().optional() // Optional to maintain backward compatibility
      },
      async ({ entityName, entityType = "project", sessionId }) => {
        try {
          // Validate session if ID is provided
          if (sessionId) {
            const sessionStates = await loadSessionStates();
            if (!sessionStates.has(sessionId)) {
              console.warn(`Warning: Session ${sessionId} not found, but proceeding with context load`);
              // Initialize it anyway for more robustness
              sessionStates.set(sessionId, []);
              await saveSessionStates(sessionStates);
            }
            
            // Track that this entity was loaded in this session
            const sessionState = sessionStates.get(sessionId) || [];
            const loadEvent = {
              type: 'context_loaded',
              timestamp: new Date().toISOString(),
              entityName,
              entityType
            };
            sessionState.push(loadEvent);
            sessionStates.set(sessionId, sessionState);
            await saveSessionStates(sessionStates);
          }
          
          // Get the entity
          // Changed from using 'name:' prefix to directly searching by the entity name
          const entityGraph = await kgm.searchNodes(entityName);
          if (entityGraph.entities.length === 0) {
            throw new Error(`Entity ${entityName} not found`);
          }
          
          // Find the exact entity by name (case-sensitive match)
          const entity = entityGraph.entities.find(e => e.name === entityName);
          if (!entity) {
            throw new Error(`Entity ${entityName} not found`);
          }
          
          // Different context loading based on entity type
          let contextMessage = "";
          
          if (entityType === "project") {
            // Get project overview
            const projectOverview = await kgm.getProjectOverview(entityName);
            
            // Get status and priority using relation-based approach
            const status = await kgm.getEntityStatus(entityName) || "Unknown";
            const priority = await kgm.getEntityPriority(entityName);
            const priorityText = priority ? `- **Priority**: ${priority}` : "";
            
            // Format observations without truncation or pattern matching
            const observationsList = entity.observations.length > 0 
              ? entity.observations.map(obs => `- ${obs}`).join("\n")
              : "No observations";
            
            // Format tasks
            const tasksText = await Promise.all((projectOverview.tasks || []).map(async (task: Entity) => {
              const taskStatus = await kgm.getEntityStatus(task.name) || "Unknown";
              const taskPriority = await kgm.getEntityPriority(task.name) || "Not set";
              // Find the first observation that doesn't look like metadata
              const description = task.observations.find(o => 
                !o.startsWith('Project:') && 
                !o.includes(':')
              ) || "No description";
              
              return `- **${task.name}** (Status: ${taskStatus}, Priority: ${taskPriority}): ${description}`;
            }));
            
            // Format milestones
            const milestonesText = await Promise.all((projectOverview.milestones || []).map(async (milestone: Entity) => {
              const milestoneStatus = await kgm.getEntityStatus(milestone.name) || "Unknown";
              // Find the first observation that doesn't look like metadata
              const description = milestone.observations.find(o => 
                !o.startsWith('Project:') && 
                !o.includes(':')
              ) || "No description";
              
              return `- **${milestone.name}** (Status: ${milestoneStatus}): ${description}`;
            }));
            
            // Format issues
            const issuesText = await Promise.all((projectOverview.issues || []).map(async (issue: Entity) => {
              const issueStatus = await kgm.getEntityStatus(issue.name) || "Unknown";
              const issuePriority = await kgm.getEntityPriority(issue.name) || "Not set";
              // Find the first observation that doesn't look like metadata
              const description = issue.observations.find(o => 
                !o.startsWith('Project:') && 
                !o.includes(':')
              ) || "No description";
              
              return `- **${issue.name}** (Status: ${issueStatus}, Priority: ${issuePriority}): ${description}`;
            }));
            
            // Format team members
            const teamMembersText = (projectOverview.teamMembers || []).map((member: Entity) => {
              const role = member.observations.find(o => o.startsWith('Role:'))?.split(':', 2)[1]?.trim() || 'Not specified';
              return `- **${member.name}** (Role: ${role})`;
            }).join("\n") || "No team members found";
            
            // Format risks
            const risksText = await Promise.all((projectOverview.risks || []).map(async (risk: Entity) => {
              const riskStatus = await kgm.getEntityStatus(risk.name) || "Unknown";
              const riskPriority = await kgm.getEntityPriority(risk.name) || "Not set";
              // Find the first observation that doesn't look like metadata
              const description = risk.observations.find(o => 
                !o.startsWith('Project:') && 
                !o.includes(':')
              ) || "No description";
              
              return `- **${risk.name}** (Status: ${riskStatus}, Priority: ${riskPriority}): ${description}`;
            }));
            
            contextMessage = `# Project Context: ${entityName}

## Project Overview
- **Status**: ${status}
${priorityText}

## Observations
${observationsList}

## Tasks (${projectOverview.summary.completedTasks || 0}/${projectOverview.summary.taskCount || 0} completed)
${tasksText.join("\n") || "No tasks found"}

## Milestones
${milestonesText.join("\n") || "No milestones found"}

## Issues
${issuesText.join("\n") || "No issues found"}

## Team Members
${teamMembersText}

## Risks
${risksText.join("\n") || "No risks found"}`;
          } 
          else if (entityType === "task") {
            // Get task dependencies and information
            const taskDependencies = await kgm.getTaskDependencies(entityName);
            
            // Get project name
            const projectName = taskDependencies.projectName || "Unknown project";
            
            // Get status and priority using relation-based approach
            const status = await kgm.getEntityStatus(entityName) || "Unknown";
            const priority = await kgm.getEntityPriority(entityName) || "Not set";
            
            // Format observations without truncation or pattern matching
            const observationsList = entity.observations.length > 0 
              ? entity.observations.map(obs => `- ${obs}`).join("\n")
              : "No observations";
            
            // Get assignee if available
            let assigneeText = "No assignee";
            for (const relation of entityGraph.relations) {
              if (relation.relationType === 'assigned_to' && relation.from === entityName) {
                const teamMember = entityGraph.entities.find(e => e.name === relation.to && e.entityType === 'teamMember');
                if (teamMember) {
                  assigneeText = teamMember.name;
                  break;
                }
              }
            }
            
            // Get precedes/follows relations to show task sequence
            const precedesRelations = entityGraph.relations.filter(r => 
              r.relationType === 'precedes' && r.from === entityName
            );
            
            const followsRelations = entityGraph.relations.filter(r => 
              r.relationType === 'precedes' && r.to === entityName
            );
            
            const precedesText = precedesRelations.length > 0 
              ? precedesRelations.map(r => `- **${r.to}**`).join("\n")
              : "No tasks follow this task";
              
            const followsText = followsRelations.length > 0
              ? followsRelations.map(r => `- **${r.from}**`).join("\n")
              : "No tasks precede this task";
            
            // Process dependency information
            const dependsOnTasks = [];
            const dependedOnByTasks = [];
            
            for (const dep of taskDependencies.dependencies) {
              if (dep.task.name !== entityName) {
                if (dep.dependsOn.includes(entityName)) {
                  dependsOnTasks.push(dep.task);
                }
                
                if (dep.dependedOnBy.includes(entityName)) {
                  dependedOnByTasks.push(dep.task);
                }
              }
            }
            
            // Format dependencies with async status lookup
            const dependsOnPromises = dependsOnTasks.map(async (task) => {
              const depStatus = await kgm.getEntityStatus(task.name) || "Unknown";
              return `- **${task.name}** (Status: ${depStatus}): This task depends on ${entityName}`;
            });
            
            const dependedOnByPromises = dependedOnByTasks.map(async (task) => {
              const depStatus = await kgm.getEntityStatus(task.name) || "Unknown";
              return `- **${task.name}** (Status: ${depStatus}): ${entityName} depends on this task`;
            });
            
            const dependsOnText = (await Promise.all(dependsOnPromises)).join("\n") || "No tasks depend on this task";
            const dependedOnByText = (await Promise.all(dependedOnByPromises)).join("\n") || "This task doesn't depend on other tasks";
            
            // Determine if task is on critical path
            const onCriticalPath = taskDependencies.criticalPath?.includes(entityName);
            const criticalPathText = onCriticalPath ? 
              "⚠️ This task is on the critical path. Delays will impact the project timeline." : 
              "This task is not on the critical path.";
            
            contextMessage = `# Task Context: ${entityName}

## Task Overview
- **Project**: ${projectName}
- **Status**: ${status}
- **Priority**: ${priority}
- **Assignee**: ${assigneeText}
- **Critical Path**: ${criticalPathText}

## Observations
${observationsList}

## Task Sequencing
### Tasks That Follow This Task
${precedesText}

### Tasks That Precede This Task
${followsText}

## Task Dependencies
### Tasks That Depend On This Task
${dependsOnText}

### Tasks This Task Depends On
${dependedOnByText}`;
          }
          else if (entityType === "milestone") {
            // Get milestone progress
            const projectName = entity.observations.find(o => o.startsWith('Project:'))?.split(':', 2)[1]?.trim();
            
            if (!projectName) {
              throw new Error(`Project not found for milestone ${entityName}`);
            }
            
            const milestoneProgress = await kgm.getMilestoneProgress(projectName, entityName);
            
            if (!milestoneProgress || !milestoneProgress.milestones || milestoneProgress.milestones.length === 0) {
              throw new Error(`Milestone progress data not available for ${entityName}`);
            }
            
            // Find this milestone
            const milestone = milestoneProgress.milestones.find((m: any) => m.milestone.name === entityName);
            
            if (!milestone) {
              throw new Error(`Milestone ${entityName} not found in progress data`);
            }
            
            // Format milestone context
            const description = milestone.info.description || "No description available";
            const date = milestone.info.date || "Not set";
            const status = milestone.info.status || "planned";
            const criteria = milestone.info.criteria || "Not specified";
            
            // Format tasks required for this milestone
            const tasksText = milestone.relatedTasks?.map((task: Entity) => {
              const taskStatus = task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'not_started';
              return `- **${task.name}** (Status: ${taskStatus})`;
            }).join("\n") || "No tasks found";
            
            // Format blockers
            const blockersText = milestone.blockers?.map((task: Entity) => {
              const taskStatus = task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'not_started';
              return `- **${task.name}** (Status: ${taskStatus})`;
            }).join("\n") || "No blocking tasks";
            
            contextMessage = `# Milestone Context: ${entityName}

## Milestone Details
- **Project**: ${projectName}
- **Status**: ${status}
- **Date**: ${date}
- **Completion Criteria**: ${criteria}
- **Description**: ${description}
- **Progress**: ${milestone.progress.completionPercentage || 0}% complete
- **Days Remaining**: ${milestone.progress.daysRemaining !== null ? milestone.progress.daysRemaining : 'Unknown'}
- **Overdue**: ${milestone.progress.isOverdue ? 'Yes' : 'No'}

## Required Tasks (${milestone.progress.completedTasks || 0}/${milestone.progress.totalTasks || 0} completed)
${tasksText}

## Blocking Tasks
${blockersText}`;
          }
          else if (entityType === "teamMember") {
            // Get team member assignments
            const teamMemberAssignments = await kgm.getTeamMemberAssignments(entityName);
            
            // Format team member context
            const role = teamMemberAssignments.info.role || "Not specified";
            const skills = teamMemberAssignments.info.skills || "Not specified";
            const availability = teamMemberAssignments.info.availability || "Not specified";
            
            // Format assigned tasks
            const tasksText = teamMemberAssignments.assignedTasks?.map((assignment: any) => {
              return `- **${assignment.task.name}** (Project: ${assignment.project?.name || 'Unassigned'}, Status: ${assignment.status}, Due: ${assignment.dueDate || 'Not set'})`;
            }).join("\n") || "No tasks assigned";
            
            // Format projects
            const projectsText = teamMemberAssignments.projects?.map((project: Entity) => {
              return `- **${project.name}**`;
            }).join("\n") || "Not assigned to any projects";
            
            // Format deadlines
            const deadlinesText = teamMemberAssignments.upcomingDeadlines?.map((assignment: any) => {
              return `- **${assignment.task.name}** (Due: ${assignment.dueDate})`;
            }).join("\n") || "No upcoming deadlines";
            
            // Format overdue tasks
            const overdueText = teamMemberAssignments.overdueTasks?.map((assignment: any) => {
              return `- **${assignment.task.name}** (Due: ${assignment.dueDate})`;
            }).join("\n") || "No overdue tasks";
            
            contextMessage = `# Team Member Context: ${entityName}

## Team Member Details
- **Role**: ${role}
- **Skills**: ${skills}
- **Availability**: ${availability}
- **Workload**: ${teamMemberAssignments.assignedTasks.length} tasks assigned (${teamMemberAssignments.workload.completionRate}% completed)

## Assigned Tasks
${tasksText}

## Projects
${projectsText}

## Upcoming Deadlines
${deadlinesText}

## Overdue Tasks
${overdueText}`;
          }
          else if (entityType === "resource") {
            // Find which project this resource belongs to
            let projectName = 'Unknown project';
            
            for (const relation of entityGraph.relations) {
              if (relation.relationType === 'part_of' && relation.from === entityName) {
                const project = entityGraph.entities.find(e => e.name === relation.to && e.entityType === 'project');
                if (project) {
                  projectName = project.name;
                  break;
                }
              }
            }
            
            // Get resource allocation
            const resourceAllocation = await kgm.getResourceAllocation(projectName, entityName);
            
            if (!resourceAllocation || !resourceAllocation.resources || resourceAllocation.resources.length === 0) {
              throw new Error(`Resource allocation data not available for ${entityName}`);
            }
            
            // Find this resource
            const resource = resourceAllocation.resources.find((r: any) => r.resource.name === entityName);
            
            if (!resource) {
              throw new Error(`Resource ${entityName} not found in allocation data`);
            }
            
            // Format resource context
            const type = resource.info.type || "Not specified";
            const availability = resource.info.availability || "Not specified";
            const capacity = resource.info.capacity || "Not specified";
            const cost = resource.info.cost || "Not specified";
            
            // Format assigned tasks
            const tasksText = resource.assignedTasks?.map((task: Entity) => {
              const status = task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'not_started';
              return `- **${task.name}** (Status: ${status})`;
            }).join("\n") || "No tasks assigned";
            
            // Format team members using this resource
            const teamMembersText = resource.teamMembers?.map((member: Entity) => {
              return `- **${member.name}**`;
            }).join("\n") || "No team members assigned";
            
            contextMessage = `# Resource Context: ${entityName}

## Resource Details
- **Type**: ${type}
- **Project**: ${projectName}
- **Availability**: ${availability}
- **Capacity**: ${capacity}
- **Cost**: ${cost}
- **Usage**: ${resource.usage.usagePercentage}% (${resource.usage.inProgressTasks} tasks in progress)

## Assigned Tasks
${tasksText}

## Team Members Using This Resource
${teamMembersText}`;
          }
          else {
            // Generic entity context for other entity types
            // Find all relations involving this entity
            const relations = await kgm.openNodes([entityName]);
            
            // Build a text representation of related entities
            const incomingRelations = relations.relations.filter(r => r.to === entityName);
            const outgoingRelations = relations.relations.filter(r => r.from === entityName);
            
            const incomingText = incomingRelations.map(rel => {
              const sourceEntity = relations.entities.find(e => e.name === rel.from);
              if (!sourceEntity) return null;
              return `- **${sourceEntity.name}** (${sourceEntity.entityType}) → ${rel.relationType} → ${entityName}`;
            }).filter(Boolean).join("\n") || "No incoming relations";
            
            const outgoingText = outgoingRelations.map(rel => {
              const targetEntity = relations.entities.find(e => e.name === rel.to);
              if (!targetEntity) return null;
              return `- **${entityName}** → ${rel.relationType} → **${targetEntity.name}** (${targetEntity.entityType})`;
            }).filter(Boolean).join("\n") || "No outgoing relations";
            
            // Format observations
            const observationsText = entity.observations.map((obs: string) => `- ${obs}`).join("\n") || "No observations";
            
            contextMessage = `# Entity Context: ${entityName} (${entityType})

## Observations
${observationsText}

## Incoming Relations
${incomingText}

## Outgoing Relations
${outgoingText}`;
          }
          
          return {
            content: [{
              type: "text",
              text: contextMessage
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
