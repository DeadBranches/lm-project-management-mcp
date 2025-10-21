<!-- SPDX-License-Identifier: MIT -->
<!-- SPDX-FileCopyrightText: 2025 The DeadBranches contributors <https://github.com/DeadBranches> -->
# LM-Project-Management MCP Documentation,<br />On *Tools*
<small><i>An MCP server for managing projects using knowledge graphs.</i></small>

*LM-Project-Management MCP* provides tools for your model to interact with.

It's your job to learn what your model can do.

>[!NOTE]
> In this documentation the terms, *model* and *client* are used interchangably to refer to the language model accessing the server.

## `startsession`
<small><sup>related: [`has_status`](entities.md#has_status), [`has_priority`](entities.md#has_priority)</sup></small>


Start a new project management session.

The model is automatically shown:
 - A list of next available tasks,
 - A summary of active projects, milestones, top risks, and high-priority tasks, and
 - The most recent sessions for continuity.



### Example Usage
> "Jeeves, I'll get out the whisky, you start a new session. We'll work on the tasting notes for tomorrow night."

### Behavior
When invoked, `startsession` performs the following:
1. generates a unique session ID
2. provides the model the start-up information.

**Q:** *What determines the information shown to the model?*

**A:** Dependancy relations determine the next task. Status and priority information are extracted from the entity graph using [`has_status`](entities.md#has_status) and [`has_priority`](entities.md#has_priority) relations.


## `loadcontext`
Loads detailed context for a specific entity (project, task, etc.), displaying relevant information based on entity type. Includes status information (inactive, active, complete), priority levels (high, low), and sequential task relationships.

## `endsession`
Records the results of a project management session through a structured, multi-stage process:
1. **summary**: Records session summary, duration, and project focus
2. **achievements**: Documents key achievements from the session
3. **taskUpdates**: Tracks updates to existing tasks
4. **newTasks**: Records new tasks created during the session
5. **statusUpdates**: Records changes to entity status values
6. **projectStatus**: Updates overall project status, priority assignments, and sequential relationships
7. **assembly**: Final assembly of all session data

## `buildcontext`
Creates new entities, relations, or observations in the knowledge graph:
- **entities**: Add new project-related entities (projects, tasks, milestones, status, priority, etc.)
- **relations**: Create relationships between entities (including `has_status`, `has_priority`, precedes)
- **observations**: Add observations to existing entities

## `deletecontext`
Removes entities, relations, or observations from the knowledge graph:
- **entities**: Remove project entities
- **relations**: Remove relationships between entities (including status, priority, and sequential relations)
- **observations**: Remove specific observations from entities

## `advancedcontext`
Retrieves information from the knowledge graph:
- **graph**: Get the entire knowledge graph
- **search**: Search for nodes based on query criteria
- **nodes**: Get specific nodes by name
- **related**: Find related entities
- **status**: Find entities with a specific status value (inactive, active, complete)
- **priority**: Find entities with a specific priority value (high, low)
- **sequence**: Identify sequential relationships for tasks