import { loadGraph as loadGraphFile, saveGraph as saveGraphFile } from "../storage/graphStore.js";
import { VALID_RELATION_TYPES, VALID_STATUS_VALUES, VALID_PRIORITY_VALUES } from "../constants/domain.js";
import type { EntityType } from "../constants/domain.js";
import { validateEntityType } from "../utils/validate.js";
import type { Entity, Relation, KnowledgeGraph } from "../types/graph.js";

type Embedding = number[];

export class KnowledgeGraphManager {
  public async loadGraph(): Promise<KnowledgeGraph> {
    return await loadGraphFile();
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    await saveGraphFile(graph);
  }
  // Initialize status and priority entities
  async initializeStatusAndPriority(): Promise<void> {
    const graph = await this.loadGraph();
    
    // Create status entities if they don't exist
    for (const statusValue of VALID_STATUS_VALUES) {
      const statusName = `status:${statusValue}`;
      if (!graph.entities.some(e => e.name === statusName && e.entityType === 'status')) {
        graph.entities.push({
          name: statusName,
          entityType: 'status',
          observations: [`A ${statusValue} status value`]
        });
      }
    }
    
    // Create priority entities if they don't exist
    for (const priorityValue of VALID_PRIORITY_VALUES) {
      const priorityName = `priority:${priorityValue}`;
      if (!graph.entities.some(e => e.name === priorityName && e.entityType === 'priority')) {
        graph.entities.push({
          name: priorityName,
          entityType: 'priority',
          observations: [`A ${priorityValue} priority value`]
        });
      }
    }
    
    await this.saveGraph(graph);
  }

  // Helper method to get status of an entity
  async getEntityStatus(entityName: string): Promise<string | null> {
    const graph = await this.loadGraph();
    
    // Find status relation for this entity
    const statusRelation = graph.relations.find(r => 
      r.from === entityName && 
      r.relationType === 'has_status'
    );
    
    if (statusRelation) {
      // Extract status value from the status entity name (status:value)
      return statusRelation.to.split(':')[1];
    }
    
    return null;
  }
  
  // Helper method to get priority of an entity
  async getEntityPriority(entityName: string): Promise<string | null> {
    const graph = await this.loadGraph();
    
    // Find priority relation for this entity
    const priorityRelation = graph.relations.find(r => 
      r.from === entityName && 
      r.relationType === 'has_priority'
    );
    
    if (priorityRelation) {
      // Extract priority value from the priority entity name (priority:value)
      return priorityRelation.to.split(':')[1];
    }
    
    return null;
  }
  
  // Helper method to set status of an entity
  async setEntityStatus(entityName: string, statusValue: string): Promise<void> {
    if (!(VALID_STATUS_VALUES as readonly string[]).includes(statusValue)) {
      throw new Error(`Invalid status value: ${statusValue}. Valid values are: ${VALID_STATUS_VALUES.join(', ')}`);
    }
    
    const graph = await this.loadGraph();
    
    // Remove any existing status relations for this entity
    graph.relations = graph.relations.filter(r => 
      !(r.from === entityName && r.relationType === 'has_status')
    );
    
    // Add new status relation
    graph.relations.push({
      from: entityName,
      to: `status:${statusValue}`,
      relationType: 'has_status'
    });
    
    await this.saveGraph(graph);
  }
  
  // Helper method to set priority of an entity
  async setEntityPriority(entityName: string, priorityValue: string): Promise<void> {
    if (!(VALID_PRIORITY_VALUES as readonly string[]).includes(priorityValue)) {
      throw new Error(`Invalid priority value: ${priorityValue}. Valid values are: ${VALID_PRIORITY_VALUES.join(', ')}`);
    }
    
    const graph = await this.loadGraph();
    
    // Remove any existing priority relations for this entity
    graph.relations = graph.relations.filter(r => 
      !(r.from === entityName && r.relationType === 'has_priority')
    );
    
    // Add new priority relation
    graph.relations.push({
      from: entityName,
      to: `priority:${priorityValue}`,
      relationType: 'has_priority'
    });
    
    await this.saveGraph(graph);
  }

  async createEntities(entities: Entity[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Validate entity names don't already exist
    for (const entity of entities) {
      if (graph.entities.some(e => e.name === entity.name)) {
        throw new Error(`Entity with name ${entity.name} already exists`);
      }
      validateEntityType(entity.entityType);
    }
    
    // Add new entities
    graph.entities.push(...entities);
    
    // Save updated graph
    await this.saveGraph(graph);
    return graph;
  }

  async createRelations(relations: Relation[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Validate relations
    for (const relation of relations) {
      // Check if entities exist
      if (!graph.entities.some(e => e.name === relation.from)) {
        throw new Error(`Entity '${relation.from}' not found`);
      }
      if (!graph.entities.some(e => e.name === relation.to)) {
        throw new Error(`Entity '${relation.to}' not found`);
      }
      if (!(VALID_RELATION_TYPES as readonly string[]).includes(relation.relationType)) {
        throw new Error(`Invalid relation type: ${relation.relationType}. Valid types are: ${VALID_RELATION_TYPES.join(', ')}`);
      }
      
      // Check if relation already exists
      if (graph.relations.some(r => 
        r.from === relation.from && 
        r.to === relation.to && 
        r.relationType === relation.relationType
      )) {
        throw new Error(`Relation from '${relation.from}' to '${relation.to}' with type '${relation.relationType}' already exists`);
      }
    }
    
    // Add relations
    graph.relations.push(...relations);
    
    // Save updated graph
    await this.saveGraph(graph);
    return graph;
  }

  async addObservations(entityName: string, observations: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Find the entity
    const entity = graph.entities.find(e => e.name === entityName);
    if (!entity) {
      throw new Error(`Entity '${entityName}' not found`);
    }
    
    // Add observations
    entity.observations.push(...observations);
    
    // Save updated graph
    await this.saveGraph(graph);
    return graph;
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    const graph = await this.loadGraph();
    
    // Remove the entities
    graph.entities = graph.entities.filter(e => !entityNames.includes(e.name));
    
    // Remove any relations that involve those entities
    graph.relations = graph.relations.filter(
      r => !entityNames.includes(r.from) && !entityNames.includes(r.to)
    );
    
    await this.saveGraph(graph);
  }

  async deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    const graph = await this.loadGraph();
    
    for (const deletion of deletions) {
      const entity = graph.entities.find(e => e.name === deletion.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(
          o => !deletion.observations.includes(o)
        );
      }
    }
    
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const graph = await this.loadGraph();
    
    // Remove matching relations
    graph.relations = graph.relations.filter(r => 
      !relations.some(
        rel => r.from === rel.from && r.to === rel.to && r.relationType === rel.relationType
      )
    );
    
    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return await this.loadGraph();
  }

  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    const lowerQuery = query.toLowerCase();
    
    // Simple implementation: search entity names, types, and observations
    const matchingEntities = graph.entities.filter(entity => 
      entity.name.toLowerCase().includes(lowerQuery) ||
      entity.entityType.toLowerCase().includes(lowerQuery) ||
      entity.observations.some(o => o.toLowerCase().includes(lowerQuery))
    );
    
    // Get entity names for filtering relations
    const matchingEntityNames = new Set(matchingEntities.map(e => e.name));
    
    // Find relations between matching entities
    const matchingRelations = graph.relations.filter(relation =>
      matchingEntityNames.has(relation.from) && matchingEntityNames.has(relation.to)
    );
    
    // Also include relations where the relation type matches the query
    const additionalRelations = graph.relations.filter(relation =>
      relation.relationType.toLowerCase().includes(lowerQuery) ||
      (relation.observations && relation.observations.some(o => o.toLowerCase().includes(lowerQuery)))
    );
    
    // Merge relations without duplicates
    const allRelations = [...matchingRelations];
    for (const relation of additionalRelations) {
      if (!allRelations.some(r => 
        r.from === relation.from && 
        r.to === relation.to && 
        r.relationType === relation.relationType
      )) {
        allRelations.push(relation);
        
        // Add the entities involved in these additional relations
        if (!matchingEntityNames.has(relation.from)) {
          const fromEntity = graph.entities.find(e => e.name === relation.from);
          if (fromEntity) {
            matchingEntities.push(fromEntity);
            matchingEntityNames.add(relation.from);
          }
        }
        
        if (!matchingEntityNames.has(relation.to)) {
          const toEntity = graph.entities.find(e => e.name === relation.to);
          if (toEntity) {
            matchingEntities.push(toEntity);
            matchingEntityNames.add(relation.to);
          }
        }
      }
    }
    
    return {
      entities: matchingEntities,
      relations: allRelations
    };
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Find the specified entities
    const entities = graph.entities.filter(e => names.includes(e.name));
    
    // Find relations between the specified entities
    const relations = graph.relations.filter(r => 
      names.includes(r.from) && names.includes(r.to)
    );
    
    return {
      entities,
      relations
    };
  }

  // Provides a comprehensive view of a project including tasks, milestones, team members, issues, etc.
  async getProjectOverview(projectName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Extract project info from observations
    const description = project.observations.find(o => o.startsWith('Description:'))?.split(':', 2)[1]?.trim();
    const startDate = project.observations.find(o => o.startsWith('StartDate:'))?.split(':', 2)[1]?.trim();
    const endDate = project.observations.find(o => o.startsWith('EndDate:'))?.split(':', 2)[1]?.trim();
    const priority = project.observations.find(o => o.startsWith('Priority:'))?.split(':', 2)[1]?.trim();
    const status = project.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'planning';
    const goal = project.observations.find(o => o.startsWith('Goal:'))?.split(':', 2)[1]?.trim();
    const budget = project.observations.find(o => o.startsWith('Budget:'))?.split(':', 2)[1]?.trim();
    
    // Find components of the project
    const components = graph.entities.filter(e => {
      return graph.relations.some(r => 
        r.from === e.name && 
        r.to === projectName && 
        r.relationType === 'part_of' &&
        e.entityType === 'component'
      );
    });
    
    // Find tasks for this project
    const tasks: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const task = graph.entities.find(e => e.name === relation.from && e.entityType === 'task');
        if (task) {
          tasks.push(task);
        }
      }
    }
    
    // Group tasks by status
    const tasksByStatus: { [status: string]: Entity[] } = {};
    for (const task of tasks) {
      const taskStatus = task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'not_started';
      if (!tasksByStatus[taskStatus]) {
        tasksByStatus[taskStatus] = [];
      }
      tasksByStatus[taskStatus].push(task);
    }
    
    // Find milestones for this project
    const milestones: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const milestone = graph.entities.find(e => e.name === relation.from && e.entityType === 'milestone');
        if (milestone) {
          milestones.push(milestone);
        }
      }
    }
    
    // Sort milestones by date
    milestones.sort((a, b) => {
      const aDate = a.observations.find(o => o.startsWith('Date:'))?.split(':', 2)[1]?.trim() || '';
      const bDate = b.observations.find(o => o.startsWith('Date:'))?.split(':', 2)[1]?.trim() || '';
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });
    
    // Find team members for this project
    const teamMembers: Entity[] = [];
    for (const relation of graph.relations) {
      if ((relation.relationType === 'assigned_to' || relation.relationType === 'manages' || relation.relationType === 'contributes_to') && 
          relation.to === projectName) {
        const teamMember = graph.entities.find(e => e.name === relation.from && e.entityType === 'teamMember');
        if (teamMember && !teamMembers.some(tm => tm.name === teamMember.name)) {
          teamMembers.push(teamMember);
        }
      }
    }
    
    // Find issues for this project
    const issues: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const issue = graph.entities.find(e => e.name === relation.from && e.entityType === 'issue');
        if (issue) {
          issues.push(issue);
        }
      }
    }
    
    // Group issues by status
    const issuesByStatus: { [status: string]: Entity[] } = {};
    for (const issue of issues) {
      const issueStatus = issue.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'identified';
      if (!issuesByStatus[issueStatus]) {
        issuesByStatus[issueStatus] = [];
      }
      issuesByStatus[issueStatus].push(issue);
    }
    
    // Find risks for this project
    const risks: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const risk = graph.entities.find(e => e.name === relation.from && e.entityType === 'risk');
        if (risk) {
          risks.push(risk);
        }
      }
    }
    
    // Find resources for this project
    const resources: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.to === projectName) {
        const resource = graph.entities.find(e => e.name === relation.from && e.entityType === 'resource');
        if (resource) {
          resources.push(resource);
        }
      }
    }
    
    // Find stakeholders for this project
    const stakeholders: Entity[] = [];
    for (const relation of graph.relations) {
      if (relation.relationType === 'stakeholder_of' && relation.to === projectName) {
        const stakeholder = graph.entities.find(e => e.name === relation.from && e.entityType === 'stakeholder');
        if (stakeholder) {
          stakeholders.push(stakeholder);
        }
      }
    }
    
    // Calculate task completion rate
    const completedTasks = tasks.filter(t => 
      t.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'completed'
    ).length;
    const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
    
    // Get upcoming milestones
    const today = new Date();
    const upcomingMilestones = milestones.filter(m => {
      const dateStr = m.observations.find(o => o.startsWith('Date:'))?.split(':', 2)[1]?.trim();
      if (dateStr) {
        const milestoneDate = new Date(dateStr);
        return milestoneDate >= today;
      }
      return false;
    });
    
    return {
      project,
      info: {
        description,
        startDate,
        endDate,
        priority,
        status,
        goal,
        budget
      },
      summary: {
        taskCount: tasks.length,
        completedTasks,
        taskCompletionRate: Math.round(taskCompletionRate),
        milestoneCount: milestones.length,
        teamMemberCount: teamMembers.length,
        issueCount: issues.length,
        riskCount: risks.length,
        componentCount: components.length
      },
      components,
      tasks,
      tasksByStatus,
      milestones,
      upcomingMilestones,
      teamMembers,
      issues,
      issuesByStatus,
      risks,
      resources,
      stakeholders
    };
  }

  // Visualizes dependencies between tasks, optionally to a specified depth
  async getTaskDependencies(taskName: string, depth: number = 2): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the task
    const task = graph.entities.find(e => e.name === taskName && e.entityType === 'task');
    if (!task) {
      throw new Error(`Task '${taskName}' not found`);
    }
    
    // Find the project this task belongs to
    let projectName: string | undefined;
    for (const relation of graph.relations) {
      if (relation.relationType === 'part_of' && relation.from === taskName) {
        const project = graph.entities.find(e => e.name === relation.to && e.entityType === 'project');
        if (project) {
          projectName = project.name;
          break;
        }
      }
    }
    
    // Initialize dependency tree
    interface DependencyNode {
      task: Entity;
      dependsOn: DependencyNode[];
      dependedOnBy: DependencyNode[];
      level: number;
    }
    
    const dependencyMap = new Map<string, DependencyNode>();
    
    // Helper function to add a task and its dependencies recursively
    const addDependencies = (taskEntity: Entity, currentLevel: number, direction: 'dependsOn' | 'dependedOnBy') => {
      if (currentLevel > depth) return;
      
      // Create node if it doesn't exist
      if (!dependencyMap.has(taskEntity.name)) {
        dependencyMap.set(taskEntity.name, {
          task: taskEntity,
          dependsOn: [],
          dependedOnBy: [],
          level: direction === 'dependsOn' ? currentLevel : 0
        });
      }
      
      const node = dependencyMap.get(taskEntity.name)!;
      
      // Update level if this path is shorter
      if (direction === 'dependsOn' && currentLevel < node.level) {
        node.level = currentLevel;
      }
      
      if (direction === 'dependsOn') {
        // Find tasks this task depends on
        for (const relation of graph.relations) {
          if (relation.relationType === 'depends_on' && relation.from === taskEntity.name) {
            const dependencyTask = graph.entities.find(e => e.name === relation.to && e.entityType === 'task');
            if (dependencyTask) {
              // Check if this dependency is already in the node's dependsOn list
              if (!node.dependsOn.some(d => d.task.name === dependencyTask.name)) {
                // Recursively add dependencies
                addDependencies(dependencyTask, currentLevel + 1, 'dependsOn');
                
                // Add this dependency to the node's dependsOn list
                const dependencyNode = dependencyMap.get(dependencyTask.name)!;
                node.dependsOn.push(dependencyNode);
                
                // Add the reverse relationship
                if (!dependencyNode.dependedOnBy.some(d => d.task.name === taskEntity.name)) {
                  dependencyNode.dependedOnBy.push(node);
                }
              }
            }
          }
        }
      } else { // direction === 'dependedOnBy'
        // Find tasks that depend on this task
        for (const relation of graph.relations) {
          if (relation.relationType === 'depends_on' && relation.to === taskEntity.name) {
            const dependentTask = graph.entities.find(e => e.name === relation.from && e.entityType === 'task');
            if (dependentTask) {
              // Check if this dependent is already in the node's dependedOnBy list
              if (!node.dependedOnBy.some(d => d.task.name === dependentTask.name)) {
                // Recursively add dependents
                addDependencies(dependentTask, currentLevel + 1, 'dependedOnBy');
                
                // Add this dependent to the node's dependedOnBy list
                const dependentNode = dependencyMap.get(dependentTask.name)!;
                node.dependedOnBy.push(dependentNode);
                
                // Add the reverse relationship
                if (!dependentNode.dependsOn.some(d => d.task.name === taskEntity.name)) {
                  dependentNode.dependsOn.push(node);
                }
              }
            }
          }
        }
      }
    };
    
    // Start with the main task and build the dependency tree in both directions
    addDependencies(task, 0, 'dependsOn');
    addDependencies(task, 0, 'dependedOnBy');
    
    // Convert to a serializable structure without circular references
    const serializableDependencies = Array.from(dependencyMap.values()).map(node => {
      const { task, level } = node;
      
      return {
        task,
        level,
        dependsOn: node.dependsOn.map(d => d.task.name),
        dependedOnBy: node.dependedOnBy.map(d => d.task.name),
        status: task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'not_started',
        dueDate: task.observations.find(o => o.startsWith('DueDate:'))?.split(':', 2)[1]?.trim(),
        assignee: this.getTaskAssignee(graph, task.name)
      };
    });
    
    // Sort by level (dependency depth)
    serializableDependencies.sort((a, b) => a.level - b.level);
    
    // Calculate the critical path
    const criticalPath = this.calculateCriticalPath(graph, serializableDependencies);
    
    return {
      task,
      projectName,
      dependencies: serializableDependencies,
      criticalPath,
      summary: {
        totalDependencies: serializableDependencies.length - 1, // Exclude the main task
        maxDepth: depth,
        blockedBy: serializableDependencies.filter(d => 
          d.task.name !== taskName && 
          d.status !== 'completed' && 
          task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() !== 'completed'
        ).length
      }
    };
  }
  
  // Helper to find the assignee of a task
  private getTaskAssignee(graph: KnowledgeGraph, taskName: string): string | undefined {
    for (const relation of graph.relations) {
      if (relation.relationType === 'assigned_to' && relation.from === taskName) {
        const teamMember = graph.entities.find(e => e.name === relation.to && e.entityType === 'teamMember');
        if (teamMember) {
          return teamMember.name;
        }
      }
    }
    return undefined;
  }
  
  // Helper to calculate the critical path
  private calculateCriticalPath(graph: KnowledgeGraph, dependencies: any[]): string[] {
    // Simple implementation - find the longest chain of dependencies
    // A more sophisticated implementation would account for task durations
    
    // Create an adjacency list
    const adjacencyList = new Map<string, string[]>();
    
    // Initialize the adjacency list for all tasks
    for (const dep of dependencies) {
      adjacencyList.set(dep.task.name, []);
    }
    
    // Populate the adjacency list with dependencies
    for (const dep of dependencies) {
      for (const dependsOn of dep.dependsOn) {
        const list = adjacencyList.get(dependsOn) || [];
        list.push(dep.task.name);
        adjacencyList.set(dependsOn, list);
      }
    }
    
    // Find tasks with no dependencies (starting points)
    const startNodes = dependencies
      .filter(dep => dep.dependsOn.length === 0)
      .map(dep => dep.task.name);
    
    // Find tasks that no other tasks depend on (end points)
    const endNodes = dependencies
      .filter(dep => dep.dependedOnBy.length === 0)
      .map(dep => dep.task.name);
    
    // If there are multiple start or end nodes, we need a more sophisticated algorithm
    // For simplicity, we'll just find the longest path from any start to any end
    
    // Find all paths from start to end
    const allPaths: string[][] = [];
    
    const findPaths = (current: string, path: string[] = []) => {
      const newPath = [...path, current];
      
      if (endNodes.includes(current)) {
        allPaths.push(newPath);
        return;
      }
      
      const nextNodes = adjacencyList.get(current) || [];
      for (const next of nextNodes) {
        // Avoid cycles
        if (!path.includes(next)) {
          findPaths(next, newPath);
        }
      }
    };
    
    for (const start of startNodes) {
      findPaths(start);
    }
    
    // Find the longest path
    allPaths.sort((a, b) => b.length - a.length);
    
    return allPaths.length > 0 ? allPaths[0] : [];
  }

  // See all tasks assigned to a team member
  async getTeamMemberAssignments(teamMemberName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the team member
    const teamMember = graph.entities.find(e => e.name === teamMemberName && e.entityType === 'teamMember');
    if (!teamMember) {
      throw new Error(`Team member '${teamMemberName}' not found`);
    }
    
    // Extract team member info
    const role = teamMember.observations.find(o => o.startsWith('Role:'))?.split(':', 2)[1]?.trim();
    const skills = teamMember.observations.find(o => o.startsWith('Skills:'))?.split(':', 2)[1]?.trim();
    const availability = teamMember.observations.find(o => o.startsWith('Availability:'))?.split(':', 2)[1]?.trim();
    
    // Find tasks assigned to this team member
    interface TaskAssignment {
      task: Entity;
      project: Entity | undefined;
      dueDate: string | undefined;
      status: string;
      priority: string | undefined;
    }
    
    const assignedTasks: TaskAssignment[] = [];
    
    // Find assigned tasks through 'assigned_to' relations
    for (const relation of graph.relations) {
      if (relation.relationType === 'assigned_to' && relation.to === teamMemberName) {
        const task = graph.entities.find(e => e.name === relation.from && e.entityType === 'task');
        if (task) {
          // Find the project this task belongs to
          let project: Entity | undefined;
          for (const taskRelation of graph.relations) {
            if (taskRelation.relationType === 'part_of' && taskRelation.from === task.name) {
              project = graph.entities.find(e => e.name === taskRelation.to && e.entityType === 'project');
              if (project) break;
            }
          }
          
          // Extract task info
          const dueDate = task.observations.find(o => o.startsWith('DueDate:'))?.split(':', 2)[1]?.trim();
          const status = task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'not_started';
          const priority = task.observations.find(o => o.startsWith('Priority:'))?.split(':', 2)[1]?.trim();
          
          assignedTasks.push({
            task,
            project,
            dueDate,
            status,
            priority
          });
        }
      }
    }
    
    // Sort tasks by due date
    assignedTasks.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    
    // Find projects this team member is involved in
    const projects: Entity[] = [];
    for (const relation of graph.relations) {
      if ((relation.relationType === 'manages' || relation.relationType === 'contributes_to') && 
          relation.from === teamMemberName) {
        const project = graph.entities.find(e => e.name === relation.to && e.entityType === 'project');
        if (project && !projects.some(p => p.name === project.name)) {
          projects.push(project);
        }
      }
    }
    
    // Group tasks by project
    const tasksByProject: { [projectName: string]: TaskAssignment[] } = {};
    for (const assignment of assignedTasks) {
      const projectName = assignment.project?.name || 'Unassigned';
      if (!tasksByProject[projectName]) {
        tasksByProject[projectName] = [];
      }
      tasksByProject[projectName].push(assignment);
    }
    
    // Group tasks by status
    const tasksByStatus: { [status: string]: TaskAssignment[] } = {};
    for (const assignment of assignedTasks) {
      if (!tasksByStatus[assignment.status]) {
        tasksByStatus[assignment.status] = [];
      }
      tasksByStatus[assignment.status].push(assignment);
    }
    
    // Calculate workload metrics
    const completedTasks = assignedTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = assignedTasks.filter(t => t.status === 'in_progress').length;
    const notStartedTasks = assignedTasks.filter(t => t.status === 'not_started').length;
    const blockedTasks = assignedTasks.filter(t => t.status === 'blocked').length;
    
    // Calculate upcoming deadlines
    const today = new Date();
    const upcomingDeadlines = assignedTasks
      .filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const dueDate = new Date(t.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 7; // Within the next week
      })
      .sort((a, b) => {
        return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
      });
    
    // Find overdue tasks
    const overdueTasks = assignedTasks
      .filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const dueDate = new Date(t.dueDate);
        return dueDate < today;
      })
      .sort((a, b) => {
        return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
      });
    
    return {
      teamMember,
      info: {
        role,
        skills,
        availability
      },
      workload: {
        totalTasks: assignedTasks.length,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        blockedTasks,
        completionRate: assignedTasks.length > 0 ? 
          Math.round((completedTasks / assignedTasks.length) * 100) : 0
      },
      assignedTasks,
      tasksByProject,
      tasksByStatus,
      projects,
      upcomingDeadlines,
      overdueTasks
    };
  }

  // Track progress toward project milestones
  async getMilestoneProgress(projectName: string, milestoneName?: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Find milestones for this project, or a specific milestone if provided
    const milestones = milestoneName 
      ? graph.entities.filter(e => 
          e.name === milestoneName && 
          e.entityType === 'milestone' &&
          graph.relations.some(r => r.from === e.name && r.to === projectName && r.relationType === 'part_of')
        )
      : graph.entities.filter(e => 
          e.entityType === 'milestone' &&
          graph.relations.some(r => r.from === e.name && r.to === projectName && r.relationType === 'part_of')
        );
    
    if (milestoneName && milestones.length === 0) {
      throw new Error(`Milestone '${milestoneName}' not found in project '${projectName}'`);
    }
    
    // Process each milestone
    const milestoneProgress: any[] = [];
    
    for (const milestone of milestones) {
      // Extract milestone info
      const description = milestone.observations.find(o => o.startsWith('Description:'))?.split(':', 2)[1]?.trim();
      const date = milestone.observations.find(o => o.startsWith('Date:'))?.split(':', 2)[1]?.trim();
      const status = milestone.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'planned';
      const criteria = milestone.observations.find(o => o.startsWith('Criteria:'))?.split(':', 2)[1]?.trim();
      
      // Find related tasks
      const relatedTasks: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'required_for' && relation.to === milestone.name) {
          const task = graph.entities.find(e => e.name === relation.from && e.entityType === 'task');
          if (task) {
            relatedTasks.push(task);
          }
        }
      }
      
      // Calculate task completion for this milestone
      const completedTasks = relatedTasks.filter(task => 
        task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'completed'
      ).length;
      
      const completionPercentage = relatedTasks.length > 0 
        ? Math.round((completedTasks / relatedTasks.length) * 100) 
        : status === 'reached' ? 100 : 0;
      
      // Calculate days until/since milestone
      let daysRemaining: number | null = null;
      let isOverdue = false;
      
      if (date) {
        const milestoneDate = new Date(date);
        const today = new Date();
        const diffTime = milestoneDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isOverdue = diffTime < 0 && status !== 'reached' && status !== 'missed';
      }
      
      // Find blockers (incomplete tasks that are required)
      const blockers = relatedTasks.filter(task => {
        const taskStatus = task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim();
        return taskStatus !== 'completed' && taskStatus !== 'cancelled';
      });
      
      milestoneProgress.push({
        milestone,
        info: {
          description,
          date,
          status,
          criteria
        },
        progress: {
          totalTasks: relatedTasks.length,
          completedTasks,
          completionPercentage,
          daysRemaining,
          isOverdue
        },
        relatedTasks,
        blockers
      });
    }
    
    // Sort milestones by date
    milestoneProgress.sort((a, b) => {
      if (!a.info.date) return 1;
      if (!b.info.date) return -1;
      return new Date(a.info.date).getTime() - new Date(b.info.date).getTime();
    });
    
    // Calculate overall project milestone progress
    const totalMilestones = milestoneProgress.length;
    const reachedMilestones = milestoneProgress.filter(m => m.info.status === 'reached').length;
    const averageCompletion = totalMilestones > 0
      ? milestoneProgress.reduce((sum, m) => sum + m.progress.completionPercentage, 0) / totalMilestones
      : 0;
    
    return {
      project,
      milestones: milestoneProgress,
      summary: {
        totalMilestones,
        reachedMilestones,
        milestoneCompletionRate: totalMilestones > 0 ? Math.round((reachedMilestones / totalMilestones) * 100) : 0,
        averageCompletion: Math.round(averageCompletion),
        nextMilestone: milestoneProgress.find(m => 
          m.info.status !== 'reached' && m.info.status !== 'missed'
        ),
        overdueMilestones: milestoneProgress.filter(m => m.progress.isOverdue).length
      }
    };
  }

  // Create a timeline view with important dates
  async getProjectTimeline(projectName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Extract project dates
    const projectStartDate = project.observations.find(o => o.startsWith('StartDate:'))?.split(':', 2)[1]?.trim();
    const projectEndDate = project.observations.find(o => o.startsWith('EndDate:'))?.split(':', 2)[1]?.trim();
    
    // Create a timeline of all dated events
    interface TimelineEvent {
      date: Date;
      entity: Entity;
      eventType: 'milestone' | 'task' | 'meeting' | 'project_start' | 'project_end';
      description?: string;
      status?: string;
    }
    
    const timelineEvents: TimelineEvent[] = [];
    
    // Add project start and end dates
    if (projectStartDate) {
      timelineEvents.push({
        date: new Date(projectStartDate),
        entity: project,
        eventType: 'project_start',
        description: 'Project Start'
      });
    }
    
    if (projectEndDate) {
      timelineEvents.push({
        date: new Date(projectEndDate),
        entity: project,
        eventType: 'project_end',
        description: 'Project End'
      });
    }
    
    // Find milestones for this project
    const milestones = graph.entities.filter(e => 
      e.entityType === 'milestone' &&
      graph.relations.some(r => r.from === e.name && r.to === projectName && r.relationType === 'part_of')
    );
    
    // Add milestones to timeline
    for (const milestone of milestones) {
      const date = milestone.observations.find(o => o.startsWith('Date:'))?.split(':', 2)[1]?.trim();
      if (date) {
        timelineEvents.push({
          date: new Date(date),
          entity: milestone,
          eventType: 'milestone',
          description: milestone.observations.find(o => o.startsWith('Description:'))?.split(':', 2)[1]?.trim(),
          status: milestone.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim()
        });
      }
    }
    
    // Find tasks with due dates
    const tasks = graph.entities.filter(e => 
      e.entityType === 'task' &&
      graph.relations.some(r => r.from === e.name && r.to === projectName && r.relationType === 'part_of')
    );
    
    // Add tasks to timeline
    for (const task of tasks) {
      const dueDate = task.observations.find(o => o.startsWith('DueDate:'))?.split(':', 2)[1]?.trim();
      if (dueDate) {
        timelineEvents.push({
          date: new Date(dueDate),
          entity: task,
          eventType: 'task',
          description: task.observations.find(o => o.startsWith('Description:'))?.split(':', 2)[1]?.trim(),
          status: task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim()
        });
      }
    }
    
    // Sort timeline events by date
    timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate time spans between events
    const timelineWithSpans = timelineEvents.map((event, index) => {
      let daysFromStart = 0;
      let daysToNext = 0;
      
      if (index === 0 && projectStartDate) {
        // First event relative to project start
        daysFromStart = 0;
      } else if (index > 0) {
        // Days from previous event
        const prevDate = timelineEvents[index - 1].date;
        daysFromStart = Math.round((event.date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      if (index < timelineEvents.length - 1) {
        // Days until next event
        const nextDate = timelineEvents[index + 1].date;
        daysToNext = Math.round((nextDate.getTime() - event.date.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      return {
        ...event,
        dateString: event.date.toISOString().split('T')[0],
        daysFromStart,
        daysToNext
      };
    });
    
    // Find the current position in the timeline
    const today = new Date();
    let currentPosition = -1;
    
    for (let i = 0; i < timelineEvents.length; i++) {
      if (timelineEvents[i].date >= today) {
        currentPosition = i;
        break;
      }
    }
    
    // If we're past all events, set current position to the last event
    if (currentPosition === -1 && timelineEvents.length > 0) {
      currentPosition = timelineEvents.length - 1;
    }
    
    // Calculate overall project progress based on timeline
    let progressPercentage = 0;
    
    if (timelineEvents.length >= 2) {
      const startDate = timelineEvents[0].date;
      const endDate = timelineEvents[timelineEvents.length - 1].date;
      const totalDuration = endDate.getTime() - startDate.getTime();
      
      if (totalDuration > 0) {
        const elapsed = today.getTime() - startDate.getTime();
        progressPercentage = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      }
    }
    
    return {
      project,
      timeline: timelineWithSpans,
      currentPosition,
      progressPercentage,
      projectDuration: timelineEvents.length >= 2 ? 
        Math.round((timelineEvents[timelineEvents.length - 1].date.getTime() - timelineEvents[0].date.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      upcomingEvents: timelineWithSpans.filter(e => e.date >= today).slice(0, 5)
    };
  }

  // Shows how resources are allocated across the project
  async getResourceAllocation(projectName: string, resourceName?: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Find resources for this project, or a specific resource if provided
    const resources = resourceName 
      ? graph.entities.filter(e => 
          e.name === resourceName && 
          e.entityType === 'resource' &&
          graph.relations.some(r => r.from === e.name && r.to === projectName && r.relationType === 'part_of')
        )
      : graph.entities.filter(e => 
          e.entityType === 'resource' &&
          graph.relations.some(r => r.from === e.name && r.to === projectName && r.relationType === 'part_of')
        );
    
    if (resourceName && resources.length === 0) {
      throw new Error(`Resource '${resourceName}' not found in project '${projectName}'`);
    }
    
    // Process each resource
    const resourceAllocations = [];
    
    for (const resource of resources) {
      // Extract resource info
      const type = resource.observations.find(o => o.startsWith('Type:'))?.split(':', 2)[1]?.trim();
      const availability = resource.observations.find(o => o.startsWith('Availability:'))?.split(':', 2)[1]?.trim();
      const capacity = resource.observations.find(o => o.startsWith('Capacity:'))?.split(':', 2)[1]?.trim();
      const cost = resource.observations.find(o => o.startsWith('Cost:'))?.split(':', 2)[1]?.trim();
      
      // Find tasks that use this resource
      const assignedTasks: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'requires' && relation.to === resource.name) {
          const task = graph.entities.find(e => e.name === relation.from && e.entityType === 'task');
          if (task) {
            assignedTasks.push(task);
          }
        }
      }
      
      // Sort tasks by due date
      assignedTasks.sort((a, b) => {
        const aDate = a.observations.find(o => o.startsWith('DueDate:'))?.split(':', 2)[1]?.trim() || '';
        const bDate = b.observations.find(o => o.startsWith('DueDate:'))?.split(':', 2)[1]?.trim() || '';
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
      
      // Group tasks by status
      const tasksByStatus: { [status: string]: Entity[] } = {};
      for (const task of assignedTasks) {
        const status = task.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'not_started';
        if (!tasksByStatus[status]) {
          tasksByStatus[status] = [];
        }
        tasksByStatus[status].push(task);
      }
      
      // Find team members using this resource
      const teamMembers: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'uses' && relation.to === resource.name) {
          const teamMember = graph.entities.find(e => e.name === relation.from && e.entityType === 'teamMember');
          if (teamMember) {
            teamMembers.push(teamMember);
          }
        }
      }
      
      // Calculate usage percentage based on assigned tasks
      const totalTasks = assignedTasks.length;
      const inProgressTasks = tasksByStatus['in_progress']?.length || 0;
      
      // Simple formula for usage percentage
      const usagePercentage = capacity 
        ? Math.min(100, Math.round((inProgressTasks / parseInt(capacity)) * 100)) 
        : totalTasks > 0 ? 50 : 0; // Default to 50% if we have tasks but no capacity
      
      resourceAllocations.push({
        resource,
        info: {
          type,
          availability,
          capacity,
          cost
        },
        usage: {
          totalTasks,
          inProgressTasks,
          usagePercentage
        },
        assignedTasks,
        tasksByStatus,
        teamMembers
      });
    }
    
    // Sort resources by usage percentage (descending)
    resourceAllocations.sort((a, b) => b.usage.usagePercentage - a.usage.usagePercentage);
    
    // Identify overallocated resources
    const overallocatedResources = resourceAllocations.filter(r => r.usage.usagePercentage > 90);
    
    // Identify underutilized resources
    const underutilizedResources = resourceAllocations.filter(r => r.usage.usagePercentage < 20 && r.usage.totalTasks > 0);
    
    return {
      project,
      resources: resourceAllocations,
      summary: {
        totalResources: resources.length,
        overallocatedCount: overallocatedResources.length,
        underutilizedCount: underutilizedResources.length
      },
      overallocatedResources,
      underutilizedResources
    };
  }

  // Identifies potential risks and their impact
  async getProjectRisks(projectName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Find risks for this project
    const risks = graph.entities.filter(e => 
      e.entityType === 'risk' &&
      graph.relations.some(r => r.from === e.name && r.to === projectName && r.relationType === 'part_of')
    );
    
    // Process each risk
    const processedRisks = [];
    
    for (const risk of risks) {
      // Extract risk info
      const description = risk.observations.find(o => o.startsWith('Description:'))?.split(':', 2)[1]?.trim();
      const likelihood = risk.observations.find(o => o.startsWith('Likelihood:'))?.split(':', 2)[1]?.trim();
      const impact = risk.observations.find(o => o.startsWith('Impact:'))?.split(':', 2)[1]?.trim();
      const status = risk.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'identified';
      const mitigation = risk.observations.find(o => o.startsWith('Mitigation:'))?.split(':', 2)[1]?.trim();
      
      // Calculate risk score (if likelihood and impact are numerical)
      let riskScore: number | undefined;
      
      if (likelihood && impact) {
        const likelihoodValue = parseInt(likelihood);
        const impactValue = parseInt(impact);
        if (!isNaN(likelihoodValue) && !isNaN(impactValue)) {
          riskScore = likelihoodValue * impactValue;
        }
      }
      
      // Find components or tasks affected by this risk
      const affectedEntities: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'impacted_by' && relation.to === risk.name) {
          const entity = graph.entities.find(e => e.name === relation.from);
          if (entity) {
            affectedEntities.push(entity);
          }
        }
      }
      
      processedRisks.push({
        risk,
        info: {
          description,
          likelihood,
          impact,
          status,
          mitigation,
          riskScore
        },
        affectedEntities
      });
    }
    
    // Sort risks by risk score (descending)
    processedRisks.sort((a, b) => {
      if (a.info.riskScore === undefined) return 1;
      if (b.info.riskScore === undefined) return -1;
      return b.info.riskScore - a.info.riskScore;
    });
    
    // Group risks by status
    const risksByStatus: { [status: string]: any[] } = {};
    for (const processedRisk of processedRisks) {
      const status = processedRisk.info.status;
      if (!risksByStatus[status]) {
        risksByStatus[status] = [];
      }
      risksByStatus[status].push(processedRisk);
    }
    
    // Identify high-priority risks
    const highPriorityRisks = processedRisks.filter(r => {
      if (r.info.riskScore !== undefined) {
        return r.info.riskScore >= 15; // Threshold for high priority
      }
      return r.info.impact === 'high' || r.info.likelihood === 'high';
    });
    
    return {
      project,
      risks: processedRisks,
      risksByStatus,
      summary: {
        totalRisks: risks.length,
        highPriorityCount: highPriorityRisks.length,
        mitigatedCount: risksByStatus['mitigating']?.length || 0,
        avoidedCount: risksByStatus['avoided']?.length || 0,
        acceptedCount: risksByStatus['accepted']?.length || 0,
        occurredCount: risksByStatus['occurred']?.length || 0
      },
      highPriorityRisks
    };
  }

  // Find connections between different projects
  async findRelatedProjects(projectName: string, depth: number = 1): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    interface ProjectConnection {
      project: Entity;
      connectionType: string;
      connectionStrength: number;
      sharedEntities: {
        teamMembers: Entity[];
        dependencies: Entity[];
        resources: Entity[];
        stakeholders: Entity[];
      };
    }
    
    const relatedProjects: ProjectConnection[] = [];
    const processedProjects = new Set<string>([projectName]);
    
    // Helper function to find connections between projects
    const findConnections = (currentProjectName: string, currentDepth: number) => {
      if (currentDepth > depth) return;
      
      // Find all other projects
      const otherProjects = graph.entities.filter(e => 
        e.entityType === 'project' && 
        e.name !== currentProjectName &&
        !processedProjects.has(e.name)
      );
      
      for (const otherProject of otherProjects) {
        // Add to processed set to avoid cycles
        processedProjects.add(otherProject.name);
        
        // Find shared team members
        const sharedTeamMembers: Entity[] = [];
        const projectTeamMembers = new Set<string>();
        const otherProjectTeamMembers = new Set<string>();
        
        // Get team members for current project
        for (const relation of graph.relations) {
          if ((relation.relationType === 'assigned_to' || relation.relationType === 'contributes_to' || relation.relationType === 'manages') && 
              relation.to === currentProjectName) {
            const teamMember = graph.entities.find(e => e.name === relation.from && e.entityType === 'teamMember');
            if (teamMember) {
              projectTeamMembers.add(teamMember.name);
            }
          }
        }
        
        // Get team members for other project
        for (const relation of graph.relations) {
          if ((relation.relationType === 'assigned_to' || relation.relationType === 'contributes_to' || relation.relationType === 'manages') && 
              relation.to === otherProject.name) {
            const teamMember = graph.entities.find(e => e.name === relation.from && e.entityType === 'teamMember');
            if (teamMember) {
              otherProjectTeamMembers.add(teamMember.name);
              if (projectTeamMembers.has(teamMember.name)) {
                sharedTeamMembers.push(teamMember);
              }
            }
          }
        }
        
        // Find shared resources
        const sharedResources: Entity[] = [];
        const projectResources = new Set<string>();
        const otherProjectResources = new Set<string>();
        
        // Get resources for current project
        for (const relation of graph.relations) {
          if (relation.relationType === 'part_of' && relation.to === currentProjectName) {
            const resource = graph.entities.find(e => e.name === relation.from && e.entityType === 'resource');
            if (resource) {
              projectResources.add(resource.name);
            }
          }
        }
        
        // Get resources for other project
        for (const relation of graph.relations) {
          if (relation.relationType === 'part_of' && relation.to === otherProject.name) {
            const resource = graph.entities.find(e => e.name === relation.from && e.entityType === 'resource');
            if (resource) {
              otherProjectResources.add(resource.name);
              if (projectResources.has(resource.name)) {
                sharedResources.push(resource);
              }
            }
          }
        }
        
        // Find shared stakeholders
        const sharedStakeholders: Entity[] = [];
        const projectStakeholders = new Set<string>();
        const otherProjectStakeholders = new Set<string>();
        
        // Get stakeholders for current project
        for (const relation of graph.relations) {
          if (relation.relationType === 'stakeholder_of' && relation.to === currentProjectName) {
            const stakeholder = graph.entities.find(e => e.name === relation.from && e.entityType === 'stakeholder');
            if (stakeholder) {
              projectStakeholders.add(stakeholder.name);
            }
          }
        }
        
        // Get stakeholders for other project
        for (const relation of graph.relations) {
          if (relation.relationType === 'stakeholder_of' && relation.to === otherProject.name) {
            const stakeholder = graph.entities.find(e => e.name === relation.from && e.entityType === 'stakeholder');
            if (stakeholder) {
              otherProjectStakeholders.add(stakeholder.name);
              if (projectStakeholders.has(stakeholder.name)) {
                sharedStakeholders.push(stakeholder);
              }
            }
          }
        }
        
        // Find dependencies between projects
        const dependencies: Entity[] = [];
        
        // Check for 'depends_on' relations between projects
        for (const relation of graph.relations) {
          if (relation.relationType === 'depends_on') {
            if (relation.from === currentProjectName && relation.to === otherProject.name) {
              dependencies.push(otherProject);
            } else if (relation.from === otherProject.name && relation.to === currentProjectName) {
              dependencies.push(project);
            }
          }
        }
        
        // Calculate connection strength (simple formula based on shared entities)
        const connectionStrength = 
          (sharedTeamMembers.length * 2) + // Team members have higher weight
          (sharedResources.length * 1.5) + // Resources are also important
          (dependencies.length * 3) +      // Dependencies have highest weight
          (sharedStakeholders.length * 1); // Stakeholders have standard weight
        
        // Determine primary connection type
        let connectionType = 'related';
        
        if (dependencies.length > 0) {
          connectionType = 'dependency';
        } else if (sharedTeamMembers.length > 0) {
          connectionType = 'shared_team';
        } else if (sharedResources.length > 0) {
          connectionType = 'shared_resources';
        } else if (sharedStakeholders.length > 0) {
          connectionType = 'shared_stakeholders';
        }
        
        // Only add connections with some relationship
        if (connectionStrength > 0) {
          relatedProjects.push({
            project: otherProject,
            connectionType,
            connectionStrength,
            sharedEntities: {
              teamMembers: sharedTeamMembers,
              dependencies,
              resources: sharedResources,
              stakeholders: sharedStakeholders
            }
          });
          
          // Recursively find connections for this project (up to the specified depth)
          findConnections(otherProject.name, currentDepth + 1);
        }
      }
    };
    
    // Start the recursive search
    findConnections(projectName, 1);
    
    // Sort related projects by connection strength
    relatedProjects.sort((a, b) => b.connectionStrength - a.connectionStrength);
    
    return {
      project,
      relatedProjects,
      summary: {
        totalRelated: relatedProjects.length,
        byConnectionType: {
          dependency: relatedProjects.filter(p => p.connectionType === 'dependency').length,
          shared_team: relatedProjects.filter(p => p.connectionType === 'shared_team').length,
          shared_resources: relatedProjects.filter(p => p.connectionType === 'shared_resources').length,
          shared_stakeholders: relatedProjects.filter(p => p.connectionType === 'shared_stakeholders').length
        },
        maxDepth: depth
      }
    };
  }

  // Get decision log for a project
  async getDecisionLog(projectName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Find decisions for this project
    const decisions = graph.entities.filter(e => 
      e.entityType === 'decision' &&
      graph.relations.some(r => r.from === e.name && r.to === projectName && r.relationType === 'part_of')
    );
    
    // Process each decision
    const processedDecisions = [];
    
    for (const decision of decisions) {
      // Extract decision info
      const description = decision.observations.find(o => o.startsWith('Description:'))?.split(':', 2)[1]?.trim();
      const date = decision.observations.find(o => o.startsWith('Date:'))?.split(':', 2)[1]?.trim();
      const status = decision.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'proposed';
      const rationale = decision.observations.find(o => o.startsWith('Rationale:'))?.split(':', 2)[1]?.trim();
      const alternatives = decision.observations.find(o => o.startsWith('Alternatives:'))?.split(':', 2)[1]?.trim();
      
      // Find team members involved in this decision
      const involvedTeamMembers: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'created_by' && relation.from === decision.name) {
          const teamMember = graph.entities.find(e => e.name === relation.to && e.entityType === 'teamMember');
          if (teamMember) {
            involvedTeamMembers.push(teamMember);
          }
        }
      }
      
      // Find entities affected by this decision
      const affectedEntities: Entity[] = [];
      for (const relation of graph.relations) {
        if (relation.relationType === 'impacted_by' && relation.to === decision.name) {
          const entity = graph.entities.find(e => e.name === relation.from);
          if (entity) {
            affectedEntities.push(entity);
          }
        }
      }
      
      processedDecisions.push({
        decision,
        info: {
          description,
          date,
          status,
          rationale,
          alternatives
        },
        involvedTeamMembers,
        affectedEntities
      });
    }
    
    // Sort decisions by date (most recent first)
    processedDecisions.sort((a, b) => {
      if (!a.info.date) return 1;
      if (!b.info.date) return -1;
      return new Date(b.info.date).getTime() - new Date(a.info.date).getTime();
    });
    
    // Group decisions by status
    const decisionsByStatus: { [status: string]: any[] } = {};
    for (const processedDecision of processedDecisions) {
      const status = processedDecision.info.status;
      if (!decisionsByStatus[status]) {
        decisionsByStatus[status] = [];
      }
      decisionsByStatus[status].push(processedDecision);
    }
    
    return {
      project,
      decisions: processedDecisions,
      decisionsByStatus,
      summary: {
        totalDecisions: decisions.length,
        approvedCount: decisionsByStatus['approved']?.length || 0,
        implementedCount: decisionsByStatus['implemented']?.length || 0,
        rejectedCount: decisionsByStatus['rejected']?.length || 0,
        proposedCount: decisionsByStatus['proposed']?.length || 0
      }
    };
  }

  // Analyze the overall health of the project
  async getProjectHealth(projectName: string): Promise<any> {
    const graph = await this.loadGraph();
    
    // Find the project
    const project = graph.entities.find(e => e.name === projectName && e.entityType === 'project');
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }
    
    // Get project information
    const status = project.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() || 'planning';
    const startDate = project.observations.find(o => o.startsWith('StartDate:'))?.split(':', 2)[1]?.trim();
    const endDate = project.observations.find(o => o.startsWith('EndDate:'))?.split(':', 2)[1]?.trim();
    
    // Helper function to get entities of a specific type for this project
    const getProjectEntities = (entityType: EntityType) => {
      return graph.entities.filter(e => 
        e.entityType === entityType &&
        graph.relations.some(r => r.from === e.name && r.to === projectName && r.relationType === 'part_of')
      );
    };
    
    // Get counts of various entities
    const tasks = getProjectEntities('task');
    const milestones = getProjectEntities('milestone');
    const issues = getProjectEntities('issue');
    const risks = getProjectEntities('risk');
    
    // Calculate task metrics
    const completedTasks = tasks.filter(t => 
      t.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'completed'
    ).length;
    
    const blockedTasks = tasks.filter(t => 
      t.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'blocked'
    ).length;
    
    const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
    
    // Calculate milestone metrics
    const reachedMilestones = milestones.filter(m => 
      m.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'reached'
    ).length;
    
    const missedMilestones = milestones.filter(m => 
      m.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'missed'
    ).length;
    
    const milestoneCompletionRate = milestones.length > 0 ? (reachedMilestones / milestones.length) * 100 : 0;
    
    // Calculate issue metrics
    const resolvedIssues = issues.filter(i => 
      i.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'resolved'
    ).length;
    
    const openIssues = issues.length - resolvedIssues;
    
    // Calculate risk metrics
    const mitigatedRisks = risks.filter(r => 
      r.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'mitigating' ||
      r.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'avoided'
    ).length;
    
    const activeRisks = risks.filter(r => 
      r.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'identified' ||
      r.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() === 'monitoring'
    ).length;
    
    // Calculate timeline metrics
    let timelineProgress = 0;
    let behindSchedule = false;
    
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      
      if (end > start) {
        // Calculate percentage of timeline elapsed
        const totalDuration = end - start;
        const elapsed = now - start;
        const timeElapsedPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        
        // Calculate if project is behind schedule (completion percentage significantly less than time elapsed)
        behindSchedule = taskCompletionRate < (timeElapsedPercent - 15); // More than 15% behind
        
        timelineProgress = Math.round(timeElapsedPercent);
      }
    }
    
    // Calculate overall health score
    // This is a simple formula - can be adjusted based on specific project needs
    const healthFactors = [
      // Task factors
      tasks.length > 0 ? Math.min(100, taskCompletionRate) : 50,
      tasks.length > 0 ? Math.max(0, 100 - (blockedTasks / tasks.length) * 200) : 50,
      
      // Milestone factors
      milestones.length > 0 ? Math.min(100, milestoneCompletionRate) : 50,
      milestones.length > 0 ? Math.max(0, 100 - (missedMilestones / milestones.length) * 200) : 50,
      
      // Issue factors
      issues.length > 0 ? Math.min(100, (resolvedIssues / issues.length) * 100) : 50,
      issues.length > 0 ? Math.max(0, 100 - (openIssues / issues.length) * 100) : 50,
      
      // Risk factors
      risks.length > 0 ? Math.min(100, (mitigatedRisks / risks.length) * 100) : 50,
      risks.length > 0 ? Math.max(0, 100 - (activeRisks / risks.length) * 100) : 50,
      
      // Schedule factor
      behindSchedule ? 30 : 70 // Penalize being behind schedule
    ];
    
    // Average the health factors
    const healthScore = Math.round(healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length);
    
    // Determine health status
    let healthStatus;
    if (healthScore >= 80) {
      healthStatus = 'healthy';
    } else if (healthScore >= 60) {
      healthStatus = 'attention_needed';
    } else if (healthScore >= 40) {
      healthStatus = 'at_risk';
    } else {
      healthStatus = 'critical';
    }
    
    // Find top issues (if any)
    const topIssues = issues
      .filter(i => 
        i.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() !== 'resolved' &&
        i.observations.find(o => o.startsWith('Status:'))?.split(':', 2)[1]?.trim() !== 'wont_fix'
      )
      .sort((a, b) => {
        const aPriority = a.observations.find(o => o.startsWith('Priority:'))?.split(':', 2)[1]?.trim() || 'N/A';
        const bPriority = b.observations.find(o => o.startsWith('Priority:'))?.split(':', 2)[1]?.trim() || 'N/A';
        
        // Simple priority sorting
        if (aPriority === 'high' && bPriority !== 'high') return -1;
        if (aPriority !== 'high' && bPriority === 'high') return 1;
        if (aPriority === 'N/A' && bPriority === 'low') return -1;
        if (aPriority === 'low' && bPriority === 'N/A') return 1;
        return 0;
      })
      .slice(0, 3); // Top 3 issues
    
    return {
      project,
      healthScore,
      healthStatus,
      metrics: {
        tasks: {
          total: tasks.length,
          completed: completedTasks,
          blocked: blockedTasks,
          completionRate: Math.round(taskCompletionRate)
        },
        milestones: {
          total: milestones.length,
          reached: reachedMilestones,
          missed: missedMilestones,
          completionRate: Math.round(milestoneCompletionRate)
        },
        issues: {
          total: issues.length,
          resolved: resolvedIssues,
          open: openIssues,
          resolutionRate: issues.length > 0 ? Math.round((resolvedIssues / issues.length) * 100) : 0
        },
        risks: {
          total: risks.length,
          mitigated: mitigatedRisks,
          active: activeRisks,
          mitigationRate: risks.length > 0 ? Math.round((mitigatedRisks / risks.length) * 100) : 0
        },
        timeline: {
          progress: timelineProgress,
          behindSchedule
        }
      },
      topIssues,
      recommendations: this.generateHealthRecommendations(healthStatus, {
        tasks,
        milestones,
        issues,
        risks,
        behindSchedule
      })
    };
  }
  
  // Helper method to generate health recommendations
  private generateHealthRecommendations(healthStatus: string, metrics: any): string[] {
    const recommendations: string[] = [];
    
    switch (healthStatus) {
      case 'healthy':
        recommendations.push('Continue current management practices');
        recommendations.push('Document successful strategies for future projects');
        break;
        
      case 'attention_needed':
        if (metrics.tasks.blocked > 0) {
          recommendations.push('Address blocked tasks to maintain momentum');
        }
        if (metrics.issues.open > 2) {
          recommendations.push('Resolve open issues to prevent escalation');
        }
        if (metrics.behindSchedule) {
          recommendations.push('Review project timeline and adjust as needed');
        }
        break;
        
      case 'at_risk':
        if (metrics.tasks.blocked > 0) {
          recommendations.push('Urgently resolve blocked tasks - consider reassigning resources');
        }
        if (metrics.behindSchedule) {
          recommendations.push('Reevaluate project scope and timeline - consider adjustments');
        }
        if (metrics.risks.active > 0) {
          recommendations.push('Implement mitigation strategies for active risks immediately');
        }
        if (metrics.issues.open > 0) {
          recommendations.push('Prioritize issue resolution and prevent new issues');
        }
        break;
        
      case 'critical':
        recommendations.push('Conduct emergency project review with stakeholders');
        recommendations.push('Consider project restructuring or reset');
        recommendations.push('Implement daily status meetings and tight monitoring');
        if (metrics.tasks.blocked > 0) {
          recommendations.push('Escalate blocked tasks to management for immediate action');
        }
        if (metrics.risks.active > 0) {
          recommendations.push('Reassess all project risks and implement mitigation measures');
        }
        break;
    }
    
    return recommendations;
  }
}
