import { validEntityTypes } from "../constants/domain.js";
import type { EntityType } from "../constants/domain.js";

export function isValidEntityType(type: string): type is EntityType {
  return (validEntityTypes as readonly string[]).includes(type);
}

export function validateEntityType(type: string): void {
  if (!isValidEntityType(type)) {
    throw new Error(
      `Invalid entity type: ${type}. Valid types are: ${validEntityTypes.join(", ")}`
    );
  }
}
