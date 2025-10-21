import type { EntityType } from "../constants/domain.js";

export type Embedding = number[];

export interface Entity {
  name: string;
  entityType: EntityType;
  observations: string[];
  embedding?: Embedding;
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
  observations?: string[];
}

export interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}
