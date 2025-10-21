import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { KnowledgeGraphManager } from "../graph/KnowledgeGraphManager.js";
import type { ToolKey } from "../utils/toolDescriptions.js";

import { registerStartSession } from "./tools/startsession.js";
import { registerLoadContext } from "./tools/loadcontext.js";
import { registerEndSession } from "./tools/endsession.js";
import { registerBuildContext } from "./tools/buildcontext.js";
import { registerDeleteContext } from "./tools/deletecontext.js";
import { registerAdvancedContext } from "./tools/advancedcontext.js";
import { registerGraphResource } from "./resourceGraph.js";

type Descriptions = Record<ToolKey, string>;

export function registerAll(server: McpServer, desc: Descriptions, kgm: KnowledgeGraphManager) {
  registerGraphResource(server, kgm);
  registerStartSession(server, desc, kgm);
  registerLoadContext(server, desc, kgm);
  registerEndSession(server, desc, kgm);
  registerBuildContext(server, desc, kgm);
  registerDeleteContext(server, desc, kgm);
  registerAdvancedContext(server, desc, kgm);
}
