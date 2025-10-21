<!-- SPDX-License-Identifier: MIT -->
<!-- SPDX-FileCopyrightText: 2025 The DeadBranches contributors <https://github.com/DeadBranches> -->
# LM-Project-Management MCP Documentation Contents
<small><i>An MCP server for managing projects using knowledge graphs.</i></small>

An MCP server for managing projects using knowledge graphs.

## Domain-Specific Functions

The Project MCP Server includes specialized domain functions for project management:

- **getProjectOverview**: Comprehensive view of a project including tasks, milestones, team members, issues, etc.
- **getTaskDependencies**: Analyze task dependencies to identify blocked tasks and critical paths
- **getTeamMemberAssignments**: View all assignments for a specific team member
- **getMilestoneProgress**: Track progress towards project milestones
- **getProjectTimeline**: Analyze project timeline and key dates
- **getResourceAllocation**: Examine how resources are allocated across the project
- **getProjectRisks**: Identify and assess project risks
- **findRelatedProjects**: Discover connections between different projects
- **getDecisionLog**: Track decision history and context
- **getProjectHealth**: Assess overall project health with metrics and recommendations
- **getStatusOverview**: View all entities with a specific status (inactive, active, complete)
- **getPriorityItems**: Identify high-priority tasks and activities
- **getTaskSequence**: Visualize the sequence of tasks based on precedes relations