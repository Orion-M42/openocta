package runtime

import (
	"context"
	"testing"

	"github.com/stellarlinkco/agentsdk-go/pkg/tool"
)

type stubBashTool struct {
	output string
}

func (s stubBashTool) Name() string        { return "bash" }
func (s stubBashTool) Description() string { return "stub" }
func (s stubBashTool) Schema() *tool.JSONSchema {
	return &tool.JSONSchema{Type: "object"}
}
func (s stubBashTool) Execute(_ context.Context, _ map[string]interface{}) (*tool.ToolResult, error) {
	return &tool.ToolResult{Success: true, Output: s.output, Data: map[string]interface{}{"duration_ms": int64(12)}}, nil
}

func TestWrapBashCompatEmptySuccess(t *testing.T) {
	wrapped := wrapBashCompat(stubBashTool{output: ""})
	result, err := wrapped.Execute(context.Background(), map[string]interface{}{"command": "mkdir -p /tmp/foo"})
	if err != nil {
		t.Fatal(err)
	}
	if result == nil || !result.Success {
		t.Fatal("expected success")
	}
	if result.Output == "" {
		t.Fatal("expected non-empty output for silent success")
	}
	if want := bashEmptyOutputOK; result.Output[:len(want)] != want {
		t.Fatalf("output = %q, want prefix %q", result.Output, want)
	}
}

func TestWrapBashCompatPreservesNonEmpty(t *testing.T) {
	wrapped := wrapBashCompat(stubBashTool{output: "hello\n"})
	result, err := wrapped.Execute(context.Background(), map[string]interface{}{"command": "echo hello"})
	if err != nil {
		t.Fatal(err)
	}
	if result.Output != "hello\n" {
		t.Fatalf("output = %q, want hello\\n", result.Output)
	}
}

func TestWrapBashCompatIdempotent(t *testing.T) {
	inner := wrapBashCompat(stubBashTool{output: ""})
	outer := wrapBashCompat(inner)
	if _, ok := outer.(bashCompatTool); !ok {
		t.Fatal("expected bashCompatTool wrapper")
	}
}
