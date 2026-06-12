package handlers

import (
	"strings"

	"github.com/openocta/openocta/pkg/agent/tools"
	"github.com/openocta/openocta/pkg/config"
)

// ChatRunResources holds per-request skill/MCP/web-search overrides from the web chat UI.
// When Configured is false, all eligible skills and MCP servers are loaded.
// Web tools are enabled only when WebSearch is true.
type ChatRunResources struct {
	Configured bool
	SkillKeys  []string
	McpServers []string
	WebSearch  bool
}

func parseStringSliceParam(raw interface{}) []string {
	arr, ok := raw.([]interface{})
	if !ok || len(arr) == 0 {
		return nil
	}
	out := make([]string, 0, len(arr))
	seen := make(map[string]struct{}, len(arr))
	for _, item := range arr {
		s, ok := item.(string)
		if !ok {
			continue
		}
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		key := strings.ToLower(s)
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, s)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func parseChatRunResources(params map[string]interface{}) ChatRunResources {
	if params == nil {
		return ChatRunResources{}
	}
	raw, ok := params["resources"].(map[string]interface{})
	if !ok || raw == nil {
		return ChatRunResources{}
	}
	res := ChatRunResources{
		Configured: false,
		WebSearch:  false,
	}
	if v, ok := raw["configured"].(bool); ok {
		res.Configured = v
	}
	if v, ok := raw["webSearch"].(bool); ok {
		res.WebSearch = v
	}
	if skills := parseStringSliceParam(raw["skillKeys"]); skills != nil {
		res.SkillKeys = skills
	}
	if mcps := parseStringSliceParam(raw["mcpServers"]); mcps != nil {
		res.McpServers = mcps
	}
	return res
}

func filterMCPServersByKeys(servers map[string]config.McpServerEntry, allowed []string) map[string]config.McpServerEntry {
	if servers == nil {
		return nil
	}
	if len(allowed) == 0 {
		return map[string]config.McpServerEntry{}
	}
	allowSet := make(map[string]struct{}, len(allowed))
	for _, k := range allowed {
		k = strings.TrimSpace(k)
		if k != "" {
			allowSet[strings.ToLower(k)] = struct{}{}
		}
	}
	out := make(map[string]config.McpServerEntry, len(allowSet))
	for k, v := range servers {
		if _, ok := allowSet[strings.ToLower(k)]; ok {
			out[k] = v
		}
	}
	return out
}

func chatRunEnableWebTools(res ChatRunResources) bool {
	return res.WebSearch
}

// chatRunDisallowedTools is deprecated; web tools are omitted via EnableWebTools instead.
func chatRunDisallowedTools(res ChatRunResources) []string {
	if chatRunEnableWebTools(res) {
		return nil
	}
	return append([]string(nil), tools.WebToolNames...)
}
