<!-- SPDX-License-Identifier: MIT -->
<!-- SPDX-FileCopyrightText: 2025 The DeadBranches contributors <https://github.com/DeadBranches> -->
# LM-Project-Management MCP Documentation,<br />On *Relationships*
<small><i class="sm">An MCP server for managing projects using knowledge graphs.</i></small>
<style>
.sc {
  font-variant-caps: small-caps;
}
.sup {
  vertical-align: super;
}
.sm {
  font-size: smaller;
}
</style>

## Entity Relationship Quick-reference

Entities can be connected through the following relationship types.

| category | relationship |
| --- | --- |
| Connections | [`related_to`](#related_to)<br />[`contributes_to`](#contributes_to) |
| dependency | [`part_of`](#part_of)<br />[`depends_on`](#depends_on)<br />[`blocks`](#blocks)<br />[`required_for`](#required_for)<br />[`precedes`](#precedes)<br /> [`impacted_by`](#impacted_by) |
| Traceability | [`created_by`](#created_by)<br />[`modified_by`](#modified_by) |
| Accountability | [`scheduled_for`](#scheduled_for) <br />[`assigned_to`](#assigned_to)<br />[`reports_to`](#reports_to)<br />[`responsible_for`](#responsible_for)<br /> [`stakeholder_of`](#stakeholder_of) |
| Role | [`manages`](#manages) <br />[`documents`](#documents)<br />[`categorized_as`](#categorized_as) |
| Priority/Status | [`prioritized_as`](#prioritized_as)<br />[`has_priority`](#has_priority)<br />[`has_status`](#has_status) |
| Issue | [`discovered_in`](#discovered_in)<br />[`resolved_by`](#resolved_by) |

## Entity Relationship Reference

### `part_of`
Indicates an entity is a component/subset of another

### `depends_on`
Shows dependencies between entities

### `assigned_to`
Links tasks to team members

### `created_by`
Tracks who created an entity

### `modified_by`
Records who changed an entity

### `related_to`
Shows general connections between entities

### `blocks`
Indicates one entity is blocking another

### `manages`
Shows management relationships

### `contributes_to`
Shows contributions to entities

### `documents`
Links documentation to entities

### `scheduled_for`
Connects entities to dates or timeframes

### `responsible_for`
Assigns ownership/responsibility

### `reports_to`
Indicates reporting relationships

### `categorized_as`
Links entities to categories or types

### `required_for`
Shows requirements for completion

### `discovered_in`
Links issues to their discovery context

### `resolved_by`
Shows what resolved an issue

### `impacted_by`
Shows impact relationships

### `stakeholder_of`
Links stakeholders to projects/components

### `prioritized_as`
Indicates priority levels

### `has_status`
Links entities to their current status (inactive, active, complete)

### `has_priority`
Links entities to their priority level (high, low)

### `precedes`
Indicates that one task comes before another in a sequence