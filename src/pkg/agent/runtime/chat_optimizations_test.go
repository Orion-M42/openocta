package runtime

import (
	"context"
	"testing"

	"github.com/stellarlinkco/agentsdk-go/pkg/api"
	"github.com/stellarlinkco/agentsdk-go/pkg/model"
)

type stubChatModel struct {
	model.Model
}

func (stubChatModel) Complete(ctx context.Context, req model.Request) (*model.Response, error) {
	return &model.Response{Message: model.Message{Role: "assistant", Content: "ok"}}, nil
}

func (stubChatModel) CompleteStream(ctx context.Context, req model.Request, cb model.StreamHandler) error {
	if cb != nil {
		return cb(model.StreamResult{
			Final:    true,
			Response: &model.Response{Message: model.Message{Role: "assistant", Content: "ok"}},
		})
	}
	return nil
}

func TestApplyChatAgentOptimizationsSetsMinimalSchema(t *testing.T) {
	t.Parallel()

	apiOpts := api.Options{}
	applyChatAgentOptimizations(&apiOpts, Options{})
	if apiOpts.ToolPromptSchema != api.ToolPromptSchemaMinimal {
		t.Fatalf("ToolPromptSchema=%q, want minimal", apiOpts.ToolPromptSchema)
	}
}

func TestChatRuntimeMinimalToolDefinitions(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	apiOpts := api.Options{
		ProjectRoot: root,
		Model:       stubChatModel{},
		EnabledBuiltinTools: []string{
			"read",
			"bash",
		},
	}
	applyChatAgentOptimizations(&apiOpts, Options{})

	rt, err := api.New(context.Background(), apiOpts)
	if err != nil {
		t.Fatalf("api.New: %v", err)
	}
	t.Cleanup(func() { _ = rt.Close() })

	defs := rt.AvailableTools()
	if len(defs) == 0 {
		t.Fatalf("expected tools")
	}
	for _, def := range defs {
		if def.Name == "describe_tool" {
			if def.Parameters == nil {
				t.Fatalf("describe_tool should keep parameters in minimal mode")
			}
			continue
		}
		if def.Parameters != nil {
			t.Fatalf("tool %q should have nil Parameters, got %v", def.Name, def.Parameters)
		}
	}
}
