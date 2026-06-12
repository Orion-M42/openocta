// Package runtime: builtin tools from agentsdk-go v2 (bash, read, write, edit, grep, glob).
package runtime

import (
	"context"
	"fmt"
	"runtime"
	"strings"
	"time"

	"github.com/openocta/openocta/pkg/agent/tools"
	"github.com/stellarlinkco/agentsdk-go/pkg/tool"
	toolbuiltin "github.com/stellarlinkco/agentsdk-go/pkg/tool/builtin"
)

const (
	defaultWriteHTMLPath = "attachments/report.html"
	defaultWriteTextPath = "attachments/generated.txt"
)

// BuiltinTools returns built-in tools from agentsdk-go v2, rooted at projectRoot.
// Core builtins: bash, read, write, edit, grep, glob（skill 由 Runtime 单独注册）.
// When sandboxDisabled is true, tools use nil FileSystemPolicy so path validation is skipped.
func BuiltinTools(projectRoot string, sandboxDisabled bool) []tool.Tool {
	if projectRoot == "" {
		projectRoot = "."
	}

	// Use custom bash tool on Windows to avoid window flashing
	var bash tool.Tool
	if isWindows() {
		bash = &tools.CustomBashTool{}
	} else {
		bash = toolbuiltin.NewBashToolWithRoot(projectRoot)
	}

	read := toolbuiltin.NewReadToolWithRoot(projectRoot)
	write := toolbuiltin.NewWriteToolWithRoot(projectRoot)
	edit := toolbuiltin.NewEditToolWithRoot(projectRoot)
	grep := toolbuiltin.NewGrepToolWithRoot(projectRoot)
	glob := toolbuiltin.NewGlobToolWithRoot(projectRoot)
	if sandboxDisabled {
		if !isWindows() {
			bash = toolbuiltin.NewBashToolWithSandbox(projectRoot, nil)
		}
		read = toolbuiltin.NewReadToolWithSandbox(projectRoot, nil)
		write = toolbuiltin.NewWriteToolWithSandbox(projectRoot, nil)
		edit = toolbuiltin.NewEditToolWithSandbox(projectRoot, nil)
		grep = toolbuiltin.NewGrepToolWithSandbox(projectRoot, nil)
		grep.SetRespectGitignore(true)
		glob = toolbuiltin.NewGlobToolWithSandbox(projectRoot, nil)
		glob.SetRespectGitignore(true)
	}

	readDeliverable := tools.WrapReadToolWithDeliverables(read, projectRoot)
	readCompat := compatTool{Tool: readDeliverable}
	writeCompat := compatTool{Tool: write}
	editCompat := compatTool{Tool: edit}
	bash = wrapBashCompat(bash)

	// Canonical tool names only (read/write/edit). Param aliases are normalized at Execute time
	// to keep tool schemas small and reduce LLM input tokens.
	return []tool.Tool{
		bash,
		readCompat,
		writeCompat,
		editCompat,
		grep,
		glob,
	}
}

func isWindows() bool {
	return runtime.GOOS == "windows"
}

type compatTool struct {
	tool.Tool
}

func (c compatTool) Description() string {
	switch c.Tool.Name() {
	case "read":
		return "Read a text file in the sandbox (file_path; optional offset/limit). Text files only."
	case "write":
		return "Write content to a sandbox file (content required; file_path optional)."
	case "edit":
		return "Edit a sandbox text file by replacing old_string with new_string."
	default:
		return c.Tool.Description()
	}
}

func (c compatTool) Schema() *tool.JSONSchema {
	orig := c.Tool.Schema()
	if orig == nil {
		return nil
	}
	props := make(map[string]interface{})
	for k, v := range orig.Properties {
		props[k] = v
	}

	name := c.Tool.Name()
	if name == "write" {
		if _, ok := props["file_path"]; ok {
			props["file_path"] = map[string]interface{}{
				"type":        "string",
				"description": "Optional output path (defaults to attachments/ when omitted).",
			}
		}
	}

	required := orig.Required
	if name == "write" {
		required = []string{"content"}
	}

	return &tool.JSONSchema{
		Type:       orig.Type,
		Properties: props,
		Required:   required,
	}
}

func (c compatTool) Execute(ctx context.Context, params map[string]interface{}) (*tool.ToolResult, error) {
	if params == nil {
		params = map[string]interface{}{}
	}

	normalizeFilePathAliases(params)

	switch c.Tool.Name() {
	case "write":
		normalizeWriteContentAliases(params)
		ensureDefaultWriteFilePath(params)
		content, _ := stringValue(params["content"])
		result, err := c.Tool.Execute(ctx, params)
		if err != nil {
			return nil, err
		}
		if result != nil && result.Success {
			if warn := htmlCompletenessWarning(content); warn != "" {
				result.Output += warn
			}
		}
		return result, nil
	}

	return c.Tool.Execute(ctx, params)
}

func normalizeFilePathAliases(params map[string]interface{}) {
	if hasNonEmptyString(params, "file_path") {
		return
	}
	for _, key := range []string{"path", "filepath", "filePath", "filename", "file", "name"} {
		if v, ok := params[key]; ok && v != nil {
			if s, ok := stringValue(v); ok && strings.TrimSpace(s) != "" {
				params["file_path"] = s
				return
			}
		}
	}
}

func normalizeWriteContentAliases(params map[string]interface{}) {
	if _, ok := params["content"]; ok {
		return
	}
	for _, key := range []string{"text", "body", "data", "html", "code"} {
		if v, ok := params[key]; ok && v != nil {
			params["content"] = v
			return
		}
	}
}

func ensureDefaultWriteFilePath(params map[string]interface{}) {
	if hasNonEmptyString(params, "file_path") {
		return
	}
	content, _ := stringValue(params["content"])
	if looksLikeHTML(content) {
		params["file_path"] = defaultWriteHTMLPath
		return
	}
	params["file_path"] = fmt.Sprintf("attachments/generated-%d.txt", time.Now().Unix())
}

func hasNonEmptyString(params map[string]interface{}, key string) bool {
	v, ok := params[key]
	if !ok || v == nil {
		return false
	}
	s, ok := stringValue(v)
	return ok && strings.TrimSpace(s) != ""
}

func stringValue(v interface{}) (string, bool) {
	switch t := v.(type) {
	case string:
		return t, true
	case []byte:
		return string(t), true
	default:
		return fmt.Sprint(v), true
	}
}

func looksLikeHTML(s string) bool {
	trimmed := strings.ToLower(strings.TrimSpace(s))
	if trimmed == "" {
		return false
	}
	return strings.HasPrefix(trimmed, "<!doctype html") ||
		strings.HasPrefix(trimmed, "<html") ||
		strings.Contains(trimmed, "<body") ||
		strings.Contains(trimmed, "<head")
}

// htmlCompletenessWarning detects HTML that was likely cut off by model output token limits.
// The write tool itself has no practical byte cap (maxBytes=0); truncation happens upstream
// when the model stops generating the tool call JSON before the intended HTML is complete.
func htmlCompletenessWarning(content string) string {
	if !looksLikeHTML(content) {
		return ""
	}
	lower := strings.ToLower(content)
	var missing []string
	if strings.Contains(lower, "<html") && !strings.Contains(lower, "</html>") {
		missing = append(missing, "</html>")
	}
	if strings.Contains(lower, "<body") && !strings.Contains(lower, "</body>") {
		missing = append(missing, "</body>")
	}
	if strings.Contains(lower, "<head") && !strings.Contains(lower, "</head>") {
		missing = append(missing, "</head>")
	}
	if len(missing) == 0 {
		return ""
	}
	return fmt.Sprintf(
		"\n\n⚠ HTML may be incomplete (missing %s). This is usually caused by the model hitting max_output_tokens while generating the write call—not a write tool size limit. Increase model maxTokens (e.g. 65536) or append remaining content with edit.",
		strings.Join(missing, ", "),
	)
}
