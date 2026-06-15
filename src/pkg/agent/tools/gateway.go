package tools

import (
	"context"
	"encoding/json"

	"github.com/stellarlinkco/agentsdk-go/pkg/tool"
)

// GatewayTool exposes config.get and config.schema to the agent via the gateway.
type GatewayTool struct {
	Invoker GatewayInvoker
}

// Name returns the tool name.
func (GatewayTool) Name() string {
	return "gateway_config"
}

// Description returns the tool description.
func (GatewayTool) Description() string {
	return "Read or patch OpenOcta config (~/.openocta/openocta.json). Actions: get (returns hash), schema, env, patch (requires baseHash from get)."
}

// Schema returns the parameter schema.
func (GatewayTool) Schema() *tool.JSONSchema {
	return &tool.JSONSchema{
		Type: "object",
		Properties: map[string]interface{}{
			"action": map[string]interface{}{
				"type":        "string",
				"description": "get, schema, env, or patch",
				"enum":        []string{"get", "schema", "env", "patch"},
			},
			"path": map[string]interface{}{"type": "string", "description": "Optional config path for get"},
			"baseHash": map[string]interface{}{
				"type":        "string",
				"description": "Required for patch: hash from the latest get response",
			},
			"patch": map[string]interface{}{
				"type":        "object",
				"description": "Required for patch: partial config object to merge (only changed keys)",
			},
		},
		Required: []string{"action"},
	}
}

// Execute runs the tool.
func (t GatewayTool) Execute(ctx context.Context, params map[string]interface{}) (*tool.ToolResult, error) {
	if t.Invoker == nil {
		return &tool.ToolResult{Success: false, Output: "gateway_config: invoker not configured"}, nil
	}
	action, _ := params["action"].(string)
	if action == "" {
		return &tool.ToolResult{Success: false, Output: "action is required"}, nil
	}
	invokeParams := params
	if action == "patch" {
		baseHash, _ := params["baseHash"].(string)
		if baseHash == "" {
			return &tool.ToolResult{Success: false, Output: "baseHash is required for patch; call get first"}, nil
		}
		patch, ok := params["patch"].(map[string]interface{})
		if !ok || patch == nil {
			return &tool.ToolResult{Success: false, Output: "patch object is required for patch action"}, nil
		}
		raw, err := json.Marshal(patch)
		if err != nil {
			return &tool.ToolResult{Success: false, Output: "failed to encode patch: " + err.Error()}, nil
		}
		invokeParams = map[string]interface{}{
			"baseHash": baseHash,
			"raw":      string(raw),
		}
	}
	method := "config." + action
	ok, payload, err := t.Invoker.Invoke(method, invokeParams)
	if err != nil {
		return &tool.ToolResult{Success: false, Output: err.Error()}, nil
	}
	if !ok {
		return &tool.ToolResult{Success: false, Output: method + " failed"}, nil
	}
	out, _ := json.Marshal(payload)
	return &tool.ToolResult{Success: true, Output: string(out)}, nil
}
