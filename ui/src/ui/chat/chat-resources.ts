/** Per-session chat resource selection (skills / MCP / web search). */

export type ChatSessionResources = {
  /** When false, all skills/MCP are available; web search is off unless webSearch is true. */
  configured: boolean;
  skillKeys: string[];
  mcpServers: string[];
  webSearch: boolean;
};

export const defaultChatSessionResources = (): ChatSessionResources => ({
  configured: false,
  skillKeys: [],
  mcpServers: [],
  webSearch: false,
});

export function chatResourcesPayload(resources: ChatSessionResources) {
  return {
    configured: resources.configured,
    skillKeys: resources.skillKeys,
    mcpServers: resources.mcpServers,
    webSearch: resources.webSearch,
  };
}

export function chatResourcesSelectionCount(resources: ChatSessionResources): number {
  if (!resources.configured) {
    return 0;
  }
  let n = resources.skillKeys.length + resources.mcpServers.length;
  if (resources.webSearch) {
    n += 1;
  }
  return n;
}

export type ChatResourcesPanelUi = {
  chatResourcesPanelOpen: boolean;
  chatResourcesTab: "skills" | "mcp";
  chatResourcesSkillSearch: string;
  chatResourcesMcpSearch: string;
};

export function resetChatResourcesPanelUi(host: ChatResourcesPanelUi): void {
  host.chatResourcesPanelOpen = false;
  host.chatResourcesTab = "skills";
  host.chatResourcesSkillSearch = "";
  host.chatResourcesMcpSearch = "";
}

export function toggleChatResourcesPanel(host: ChatResourcesPanelUi): void {
  if (host.chatResourcesPanelOpen) {
    resetChatResourcesPanelUi(host);
  } else {
    host.chatResourcesPanelOpen = true;
  }
}
