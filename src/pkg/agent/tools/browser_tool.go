package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/openocta/openocta/pkg/browser"
	"github.com/openocta/openocta/pkg/config"
	"github.com/stellarlinkco/agentsdk-go/pkg/tool"
)

// BrowserToolNames lists built-in browser automation tools.
var BrowserToolNames = []string{"browser"}

// IsBrowserToolName reports whether name is the browser tool.
func IsBrowserToolName(name string) bool {
	return strings.EqualFold(strings.TrimSpace(name), "browser")
}

// BrowserToolsFromConfig registers the browser tool when enabled in config.
func BrowserToolsFromConfig(cfg *config.OpenOctaConfig) []tool.Tool {
	if !browserEnabled(cfg) {
		return nil
	}
	return []tool.Tool{&BrowserTool{Config: cfg}}
}

func browserEnabled(cfg *config.OpenOctaConfig) bool {
	if cfg == nil || cfg.Browser == nil || cfg.Browser.Enabled == nil {
		return true
	}
	return *cfg.Browser.Enabled
}

// BrowserTool exposes bundled Chromium automation via browser.request-compatible params.
type BrowserTool struct {
	Config *config.OpenOctaConfig
}

func (BrowserTool) Name() string { return "browser" }

func (BrowserTool) Description() string {
	return "Control the built-in Chromium browser (no MCP required). Actions: status, start, stop, tabs, open, close, navigate, snapshot, screenshot, act. For multi-step UI flows: open once, snapshot to get refs, then act with request.kind click/type/press/wait."
}

func (BrowserTool) Schema() *tool.JSONSchema {
	return &tool.JSONSchema{
		Type: "object",
		Properties: map[string]interface{}{
			"action": map[string]interface{}{
				"type":        "string",
				"description": "status | start | stop | tabs | open | close | navigate | snapshot | screenshot | act",
			},
			"url": map[string]interface{}{
				"type":        "string",
				"description": "URL for open/navigate",
			},
			"targetUrl": map[string]interface{}{
				"type":        "string",
				"description": "Alias for url (OpenClaw compat)",
			},
			"targetId": map[string]interface{}{
				"type":        "string",
				"description": "Tab id (t1) or label from open",
			},
			"label": map[string]interface{}{
				"type":        "string",
				"description": "Stable tab label for open",
			},
			"request": map[string]interface{}{
				"type":        "object",
				"description": "act payload: kind (click|type|press|wait), ref, text, key",
			},
		},
		Required: []string{"action"},
	}
}

func (t *BrowserTool) Execute(ctx context.Context, params map[string]interface{}) (*tool.ToolResult, error) {
	action, _ := params["action"].(string)
	if strings.TrimSpace(action) == "" {
		return &tool.ToolResult{Success: false, Output: "action is required"}, nil
	}
	payload, err := browser.HandleRequest(ctx, t.Config, os.Getenv, params)
	if err != nil {
		return &tool.ToolResult{Success: false, Output: err.Error()}, nil
	}
	raw, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return &tool.ToolResult{Success: true, Output: fmt.Sprintf("%v", payload)}, nil
	}
	return &tool.ToolResult{Success: true, Output: string(raw)}, nil
}

// BrowserToolViaInvoker calls browser.request on the gateway (for tools that only have invoker).
type BrowserToolViaInvoker struct {
	Invoker GatewayInvoker
}

func (BrowserToolViaInvoker) Name() string        { return "browser" }
func (BrowserToolViaInvoker) Description() string { return BrowserTool{}.Description() }
func (BrowserToolViaInvoker) Schema() *tool.JSONSchema {
	return BrowserTool{}.Schema()
}

func (t BrowserToolViaInvoker) Execute(ctx context.Context, params map[string]interface{}) (*tool.ToolResult, error) {
	if t.Invoker == nil {
		return &tool.ToolResult{Success: false, Output: "browser invoker not configured"}, nil
	}
	ok, payload, err := t.Invoker.Invoke("browser.request", params)
	if err != nil {
		return &tool.ToolResult{Success: false, Output: err.Error()}, nil
	}
	if !ok {
		return &tool.ToolResult{Success: false, Output: fmt.Sprintf("%v", payload)}, nil
	}
	raw, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return &tool.ToolResult{Success: true, Output: fmt.Sprintf("%v", payload)}, nil
	}
	return &tool.ToolResult{Success: true, Output: string(raw)}, nil
}
