import { promises as fs } from "fs";
import { MEMORY_FILE_PATH } from "../config/paths.js";
import type { KnowledgeGraph } from "../types/graph.js";

export async function loadGraph(): Promise<KnowledgeGraph> {
  try {
    const fileContent = await fs.readFile(MEMORY_FILE_PATH, "utf-8");
    return JSON.parse(fileContent);
  } catch {
    return { entities: [], relations: [] };
  }
}

export async function saveGraph(graph: KnowledgeGraph): Promise<void> {
  await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify(graph, null, 2), "utf-8");
}
