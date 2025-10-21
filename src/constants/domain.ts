export const validEntityTypes = [
  "project","task","milestone","resource","teamMember","note","document",
  "issue","risk","decision","dependency","component","stakeholder","change",
  "status","priority"
] as const;

export type EntityType = typeof validEntityTypes[number];

export const VALID_RELATION_TYPES = [
  "part_of","depends_on","assigned_to","created_by","modified_by","related_to",
  "blocks","manages","contributes_to","documents","scheduled_for","responsible_for",
  "reports_to","categorized_as","required_for","discovered_in","resolved_by",
  "impacted_by","stakeholder_of","prioritized_as","has_status","has_priority",
  "precedes","uses","requires","resolves"
] as const;

export const VALID_STATUS_VALUES = [
  "active","completed","pending","blocked","cancelled"
] as const;

export const STATUS_VALUES = {
  project: ["planning","in_progress","on_hold","completed","cancelled","archived"],
  task: ["not_started","in_progress","blocked","under_review","completed","cancelled"],
  milestone: ["planned","approaching","reached","missed","rescheduled"],
  issue: ["identified","analyzing","fixing","testing","resolved","wont_fix"],
  risk: ["identified","monitoring","mitigating","occurred","avoided","accepted"],
  decision: ["proposed","under_review","approved","rejected","implemented","reversed"]
} as const;

export const VALID_PRIORITY_VALUES = ["high","low"] as const;
