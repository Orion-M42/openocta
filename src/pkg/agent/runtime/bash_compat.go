package runtime

import (
	"context"
	"fmt"
	"strings"

	"github.com/stellarlinkco/agentsdk-go/pkg/tool"
)

const bashEmptyOutputOK = "(command completed successfully with no output)"

// bashCompatTool wraps bash-like tools so silent success (mkdir, touch, etc.)
// still returns a non-empty tool result for the model and UI.
type bashCompatTool struct {
	tool.Tool
}

func wrapBashCompat(inner tool.Tool) tool.Tool {
	if inner == nil {
		return nil
	}
	name := strings.ToLower(strings.TrimSpace(inner.Name()))
	switch name {
	case "bash", "windows_exec_cmd":
		return bashCompatTool{Tool: inner}
	default:
		return inner
	}
}

func (b bashCompatTool) Execute(ctx context.Context, params map[string]interface{}) (*tool.ToolResult, error) {
	result, err := b.Tool.Execute(ctx, params)
	if err != nil || result == nil || !result.Success {
		return result, err
	}
	if strings.TrimSpace(result.Output) != "" {
		return result, err
	}
	result.Output = formatBashEmptySuccessOutput(params, result)
	return result, err
}

func formatBashEmptySuccessOutput(params map[string]interface{}, result *tool.ToolResult) string {
	cmd := strings.TrimSpace(extractBashCommand(params))
	durationMs := bashDurationMs(result)
	if cmd == "" {
		return bashEmptyOutputOK
	}
	if durationMs > 0 {
		return fmt.Sprintf("%s\n$ %s\nexit_code=0 duration_ms=%d", bashEmptyOutputOK, cmd, durationMs)
	}
	return fmt.Sprintf("%s\n$ %s\nexit_code=0", bashEmptyOutputOK, cmd)
}

func extractBashCommand(params map[string]interface{}) string {
	if params == nil {
		return ""
	}
	if cmd, ok := params["command"].(string); ok {
		return cmd
	}
	return ""
}

func bashDurationMs(result *tool.ToolResult) int64 {
	if result == nil || result.Data == nil {
		return 0
	}
	data, ok := result.Data.(map[string]interface{})
	if !ok {
		return 0
	}
	switch v := data["duration_ms"].(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case float64:
		return int64(v)
	default:
		return 0
	}
}
