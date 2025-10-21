<!-- SPDX-License-Identifier: MIT -->
<!-- SPDX-FileCopyrightText: 2025 Tejpalvirk <https://github.com/tejpalvirk> -->
<!-- SPDX-FileCopyrightText: 2025 The DeadBranches contributors <https://github.com/DeadBranches> -->
# lm-project-management-mcp Server

An MCP server for managing projects using knowledge graphs.

Provides a structured representation of projects, tasks, milestones, resources, and team members to track progress, manage risks, allocate resources, and make informed decisions.

**lm-project-management-mcp** is derrived from  [tejpalvirk/project](https://github.com/tejpalvirk/project). Accordingly, this project is licenced under the MIT License.


## Who cares?

This MCP server enables project managers to:

Keep track of project details **across sessions**.

Identify and manage task status and dependencies.

Track who did what, where, and why.

Prioritize among a large number of demands.

Sequence those demands in the order that best suits you.

## Table of Contents
- [lm-project-management-mcp Server](#lm-project-management-mcp-server)
  - [Who cares?](#who-cares)
  - [Table of Contents](#table-of-contents)
  - [Feature Details](#feature-details)
  - [Entities](#entities)
  - [Entity Relationships](#entity-relationships)
  - [Available Tools](#available-tools)
  - [Domain-Specific Functions](#domain-specific-functions)
  - [Example Usage](#example-usage)
    - [Starting a Session](#starting-a-session)
    - [Loading Project Context](#loading-project-context)
    - [Recording Session Results](#recording-session-results)
    - [Managing Project Knowledge](#managing-project-knowledge)
  - [Quick Start](#quick-start)
    - [Using npm](#using-npm)
    - [Using Docker](#using-docker)
  - [Install](#install)
    - [Bare Metal](#bare-metal)
  - [Setup](#setup)
    - [Environment Variables](#environment-variables)
      - [Example usage](#example-usage-1)
  - [License](#license)
  - [Attribution \& Provenance](#attribution--provenance)


## Feature Details
Here's what you can look forward to. If you want. Up to you.<sup><small>No one is forcing you.</small></sup>

| Feature | Description |
|---|---|
| **Persistent Context**  | Knowledge graphs persist relationships between entities.| 
| **Project Status**  | On-demand project health, issue status, and risk monitoring.| 
| **Task Dependencies**  | Visualize bottlenecks and blocking tasks.| 
| **Activities**  | Track who did what *and why*.| 
| **Decision Logging**  | Traceable decision making.| 
| **Project Timeline Analysis**  | Plot a project's critical path in retrospective evaluations.| 
| **Milestone Progress**  | Work toward SMART objectives in an orderly fashion.| 
| **Resource Allocation**  | Distribute finite resources across tasks.| 
| **Risk Assessment**  | Identify, monitor, and mitigate.| 
| **Team Member Management**  | Assignments tracking and workloads for team members. |

## Entities

This mcp server works with two things: **nodes**<small><sup>entities</sup></small> and **edges**<small><sup>relationships</sup></small>.

>[!NOTE]
For detailed information, see [Entities](docs/entities.md) for details.

**Project** <small>nodes</small>
- **`project`**: The main container for all related entities
- `task`
- `component`
- `dependency`
  
**Asset** <small>nodes</small>
- `resource`
- `note`
- `document`

**Tracability/Accountability** <small>nodes</small>
- `decision`
- `change`
- `milestone`

**People**<small><sup>eww</sup></small> <small>nodes</small>
- `teamMember`
- `stakeholder`

**Status/Priority** <small>nodes</small>
- `status`
- `priority`

**Issue** <small>nodes</small>
- `issue`
- `risk`



## Entity Relationships

Relationships connect entities together.

```mermaid

```

You have a pre-defined set of relationships to work with.

Here are the types of relationship you'll be working with.

> [!NOTE]
For more details, see [Entity Relationships](docs/entity-relationships.md).


| Category | Relationship |
|---|---|
| Connections | `related_to`<br />`contributes_to` |
| dependency | `part_of`<br />`depends_on`<br />`blocks`<br />`required_for`<br />`precedes`<br /> `impacted_by` |
| Tracability | `created_by`<br />`modified_by` |
| Accountability | `scheduled_for`<br />`assigned_to`<br />`reports_to`<br />`responsible_for` | |
| Role | `manages` <br />`documents` <br />`categorized_as` |
| Priority/Status | `prioritized_as`<br />`has_priority`<br />`has_status` |
| Issue | `discovered_in`<br />`resolved_by` |
| Misc | `stakeholder_of` |

## Available Tools

Your model uses tools to interact with project knowledge. Here are the tools they'll be using. 

> [!NOTE]
For more details, see [Tools](docs/tools.md).

`startsession` - Start a new project management session.

`loadcontext` - Load the most important details about an entity (task) for work.

`buildcontext` - Creates new entities or relationships.

`deletecontext` - Removes entities or relationships.

`endsession` - Commit your changes to the record.

`advancedcontext` - Retrieve information from the knowledge graph through operations such as `search`, `related`, `sequence`. Get the whole `graph`, and more!

## Domain-Specific Functions

The mcp server includes specialized domain functions for project management.

>[!NOTE]
See [Domain Specific Functions](docs/domain-specific-functions.md) for details.

## Example Usage

Use prompts with your client to trigger the mcp server's various functions.

### Starting a Session

> "Let's start a new project management session to review the Mobile App Development project."

### Loading Project Context
> "Load the context for the Mobile App Development project so I can see its current status."

### Recording Session Results
> I've just finished a project review meeting for Mobile App Development. We completed the UI design milestone, identified 2 new risks related to the backend API, and assigned 3 new tasks to the development team. The UI tasks are now marked as complete, and we've set the API development tasks as high priority. The project is still on track but we need to monitor the API risks closely.

### Managing Project Knowledge
<small>Example 1</small>
> "Create a new task called "Implement User Authentication" that's part of the Mobile App Development project, assigned to Sarah, with high priority and due in two weeks. Set its status to active and make it precede the "User Profile" task."
> 

<small>Example 2</small>
> "Update the status of the "Database Migration" task to "completed" and add an observation that it was finished ahead of schedule."

## Quick Start

### Using npm
```bash
# Clone the repository
git clone https://github.com/DeadBranches/lm-project-management-mcp.git
cd lm-project-management-mcp

# Install dependencies (requires the included package-lock.json)
npm install

# Build the TypeScript sources to dist/
npm run build

# Start the MCP server (outputs live in dist/)
npm start
```

### Using Docker
```bash
# Build the image from the repository root Dockerfile
docker build -t lm-project-management-mcp .

# Run the container and persist data to the host
docker run \
  --rm \
  -e MEMORY_FILE_PATH=/app/data/memory.json \
  -e SESSIONS_FILE_PATH=/app/data/sessions.json \
  -v "$(pwd)/data:/app/data" \
  lm-project-management-mcp
```
The Docker build expects the repository's existing `package-lock.json` to be present so that `npm ci` can resolve dependencies.
Mount a host directory into `/app/data` (or another target directory) to keep `memory.json` and `sessions.json` between runs, and
configure the corresponding `MEMORY_FILE_PATH` / `SESSIONS_FILE_PATH` environment variables to point at the mounted location.

## Install

### Bare Metal
```bash
# Install globally without cloning
npx github:DeadBranches/lm-project-management-mcp
```

## Setup
### Environment Variables

You may wish to customize where data is stored. The following environmental variables are available.

| Environmental Variable | Description |
| --- | --- |
| `MEMORY_FILE_PATH` | <p>Path where the knowledge graph data will be stored.</p>  <p>Can be absolute or relative (relative paths use current working directory)</p>Default: **`./dist/memory.json`** when running the compiled binary (or alongside the executable when installed elsewhere). |
| `SESSIONS_FILE_PATH` | <p>Path where session data will be stored</p>Can be absolute or relative (relative paths use current working directory)</p>Default: **`./dist/sessions.json`** when running the compiled binary (or alongside the executable when installed elsewhere). |

#### Example usage

```bash
# Store data in the current directory
MEMORY_FILE_PATH="./pm-memory.json" SESSIONS_FILE_PATH="./pm-sessions.json" npx github:DeadBranches/lm-project-management-mcp

# Store data in a specific location (absolute path)
MEMORY_FILE_PATH="/path/to/data/project-memory.json" npx github:DeadBranches/lm-project-management-mcp

# Store data in user's home directory
MEMORY_FILE_PATH="$HOME/contextmanager/project-memory.json" npx github:DeadBranches/lm-project-management-mcp
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).

## Attribution & Provenance

Portions of this code are adapted from the work of [Tejpal Virk](https://github.com/tejpalvirk), as published in [tejpalvirk/project](https://github.com/tejpalvirk/project) (retrieved on October 19, 2025 at commit f00e9d3). Copyright remains with the original authors for their respective contributions. Modifications in this repository are © 2025–present DeadBranches contributors.

Copyright (c) 2025 [Tejpalvirk](https://github.com/tejpalvirk)

Copyright (c) 2025 The [DeadBranches Contributors](https://github.com/DeadBranches)
