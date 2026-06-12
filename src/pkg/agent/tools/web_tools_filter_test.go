package tools

import (
	"context"
	"testing"

	"github.com/stellarlinkco/agentsdk-go/pkg/tool"
)

type namedTool struct{ name string }

func (n namedTool) Name() string        { return n.name }
func (n namedTool) Description() string { return n.name }
func (n namedTool) Schema() *tool.JSONSchema {
	return &tool.JSONSchema{Type: "object"}
}
func (n namedTool) Execute(_ context.Context, _ map[string]interface{}) (*tool.ToolResult, error) {
	return nil, nil
}

func TestFilterOutWebTools(t *testing.T) {
	tools := []tool.Tool{
		namedTool{name: "bash"},
		namedTool{name: "web_search"},
		namedTool{name: "web_fetch"},
		namedTool{name: "download_image"},
	}
	filtered := FilterOutWebTools(tools)
	if len(filtered) != 1 || filtered[0].Name() != "bash" {
		t.Fatalf("filtered = %v, want [bash]", toolNames(filtered))
	}
}

func toolNames(tools []tool.Tool) []string {
	out := make([]string, 0, len(tools))
	for _, t := range tools {
		if t != nil {
			out = append(out, t.Name())
		}
	}
	return out
}

func TestIsWebToolName(t *testing.T) {
	if !IsWebToolName("web_search") || IsWebToolName("bash") {
		t.Fatal("IsWebToolName mismatch")
	}
}
