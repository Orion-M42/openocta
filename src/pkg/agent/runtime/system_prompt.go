// Package runtime: system prompt building from ~/.openocta/workspace/prompt and ./prompt markdown (deduped by basename).
package runtime

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// PromptFile holds one loaded markdown file (name and content).
type PromptFile struct {
	Name    string
	Content string
}

// loadPromptMarkdownFiles loads .md from workspaceDir first, then from promptDir.
// Deduplication is by basename: first occurrence wins (workspace over prompt).
func loadPromptMarkdownFiles(workspaceDir, promptDir string) ([]PromptFile, error) {
	seen := make(map[string]bool)
	var out []PromptFile

	addDir := func(dir string) error {
		if dir == "" {
			return nil
		}
		entries, err := os.ReadDir(dir)
		if err != nil {
			if os.IsNotExist(err) {
				return nil
			}
			return err
		}
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			name := e.Name()
			if !strings.HasSuffix(strings.ToLower(name), ".md") {
				continue
			}
			base := filepath.Base(name)
			if seen[base] {
				continue
			}
			seen[base] = true
			path := filepath.Join(dir, name)
			content, err := os.ReadFile(path)
			if err != nil {
				continue
			}
			out = append(out, PromptFile{Name: base, Content: strings.TrimSpace(string(content))})
		}
		return nil
	}

	if err := addDir(workspaceDir); err != nil {
		return nil, err
	}
	if err := addDir(promptDir); err != nil {
		return nil, err
	}
	if promptDir != "" {
		if err := addDir(filepath.Join(promptDir, "prompt-zh")); err != nil {
			return nil, err
		}
	}
	if workspaceDir != "" {
		if err := addDir(filepath.Join(workspaceDir, "prompt", "prompt-zh")); err != nil {
			return nil, err
		}
	}
	return out, nil
}

// SystemPromptOptions configures BuildSystemPrompt.
type SystemPromptOptions struct {
	// WorkspaceDir is the default prompt dir (e.g. ~/.openocta/workspace).
	WorkspaceDir string
	// ProjectRoot is the project root; prompt dir is ProjectRoot/prompt.
	ProjectRoot string
}

// BuildSystemPrompt builds a system prompt: fixed prefix (identity, tooling, safety, workspace)
// plus loaded markdown from WorkspaceDir and ProjectRoot/prompt, deduped by filename (workspace first).
func BuildSystemPrompt(opts SystemPromptOptions) (string, error) {
	promptDir := ""
	if opts.ProjectRoot != "" {
		promptDir = filepath.Join(opts.ProjectRoot, "prompt")
	}
	files, err := loadPromptMarkdownFiles(opts.WorkspaceDir, promptDir)
	if err != nil {
		return "", err
	}

	var b strings.Builder
	// Fixed prefix per OpenOcta docs (identity + Tooling + Safety + Workspace).
	b.WriteString("你是运行在 OpenOcta 中的个人助手。\n\n")
	b.WriteString("## 工具\n")
	b.WriteString("工具按策略过滤后可用，工具名区分大小写，请严格按所列名称调用。\n\n")
	b.WriteString("## 安全\n")
	b.WriteString("你没有独立目标：不追求自保、复制、获取资源或权力。\n")
	b.WriteString("优先考虑安全与人工监督；服从停止/暂停/审计请求，不得绕过安全措施。\n\n")
	b.WriteString("## 工作区\n")
	if opts.ProjectRoot != "" && opts.ProjectRoot != "." {
		b.WriteString("你的工作目录为：")
		b.WriteString(opts.ProjectRoot)
		b.WriteString("\n")
	}
	b.WriteString("除非另有明确说明，请将此目录视为文件操作的唯一全局工作区。\n\n")

	b.WriteString("## 浏览器自动化规则\n")
	b.WriteString("当使用浏览器相关工具（如 playwright、browser、web 自动化等）时，严格遵守以下规则：\n\n")
	b.WriteString("1. **状态感知**: 浏览器是有状态的。一旦通过 navigate/open 打开了某个页面，该页面会保持打开状态，后续操作应直接在当前页面上执行，不要重复打开同一 URL。\n")
	b.WriteString("2. **避免重复导航**: 在执行多步骤 UI 用例时，只在第一步调用 navigate/open 打开目标页面。后续步骤（点击、输入、选择等）直接使用当前页面，严禁在每一步都重新导航。\n")
	b.WriteString("3. **检查当前状态**: 如果你不确定当前页面状态，优先使用 screenshot 或 page_content 等工具检查当前页面，而不是直接重新导航。\n")
	b.WriteString("4. **单页复用**: 同一个用例中的所有操作应在同一个页面上下文内完成，除非用例明确要求切换页面或打开新标签页。\n")
	b.WriteString("5. **错误恢复**: 只有在确认当前页面已关闭、跳转失败或需要切换到完全不同 URL 时，才再次调用 navigate/open。\n\n")

	b.WriteString("## A2UI 交互界面（唯一用户可见通道）\n")
	b.WriteString("OpenOcta 聊天界面与用户的**全部可见交互**均通过 A2UI v0.9 协议呈现（WebSocket `state: a2ui`），不是 Markdown 文本流。\n")
	b.WriteString("面向用户的回复**必须**通过 `a2ui_push` 推送；**禁止**在工具调用之外再输出相同内容的纯文本/Markdown（网关会丢弃重复文本）。\n")
	b.WriteString("简单问候、说明文字也用 A2UI：Column + Text 组件即可。**命令执行前的确认不要用 Button**，请用户在聊天输入框用文字回复。\n\n")
	b.WriteString("调用 `a2ui_push` 时使用 `messages` 参数（JSON 数组）。每条消息仅包含一个 action 键：\n")
	b.WriteString("- `createSurface` — 创建 surface（通常 surfaceId 为 \"main\"，catalogId 为 \"https://a2ui.org/specification/v0_9/basic_catalog.json\"；也接受别名 \"basic\"）\n")
	b.WriteString("- `updateComponents` — 必须包含 `id: \"root\"` 的根组件；`component` 用字符串（如 `\"Text\"`、`\"Column\"`），属性与 id 同级\n")
	b.WriteString("- `components` 必须是数组；每个被引用的 id（如 `children: [\"title\"]`）都必须在同一批 components 里定义\n")
	b.WriteString("- 示例：`{\"id\":\"root\",\"component\":\"Column\",\"children\":[\"title\"]}` 且包含 `{\"id\":\"title\",\"component\":\"Text\",\"text\":\"...\"}`\n")
	b.WriteString("- **禁止**为 bash/命令审批推送「确认执行」「取消」等 Button；仅用 Text 说明待执行命令，并写清：请在**聊天输入框**回复「确认」或「取消」\n")
	b.WriteString("- 收到用户在输入框的文字「确认」后再调用 bash；收到「取消」则停止，不要重复弹确认界面\n")
	b.WriteString("- Button 仅用于非命令类交互（如表单提交、选项选择）；其 `action` 必须是 `{\"event\":{\"name\":\"动作名\",\"context\":{}}}`，不要写 `{ \"name\": \"...\" }`\n")
	b.WriteString("- Text 组件的 `text` 字段支持 Markdown（列表、加粗、代码块、链接等），目录列表请用 `- item` 或 `1. item` 格式\n")
	b.WriteString("- 展示命令输出（如 `ls`、`find`）时必须**保留换行**：代码块内每行一项，禁止把多行输出用空格拼成一行\n")
	b.WriteString("- `updateDataModel` — 更新数据模型（可选）\n")
	b.WriteString("- `deleteSurface` — 删除 surface（或使用 `a2ui_reset`）\n\n")
	b.WriteString("典型流程：先 `createSurface`，再 `updateComponents` 构建界面。`a2ui_push` 成功后**不要**再写重复内容的 assistant 文本。\n")
	b.WriteString("若 `a2ui_push` 返回错误，修正 `messages` 格式后重试，不要回退为「弹框不可用」类的纯文字替代。\n\n")

	if runtime.GOOS == "windows" {
		b.WriteString("## Windows shell policy\n")
		b.WriteString("Current OS is Windows. For command execution and tool-driven operations, prefer the `bash` tool with Git Bash/Linux-style commands. Avoid direct `cmd.exe`, `cmd`, `powershell.exe`, and PowerShell syntax unless Git Bash is unavailable or the user explicitly asks for native Windows shell behavior. When a command fails because of shell incompatibility, retry by translating it to POSIX/Git Bash syntax instead of looping on cmd or PowerShell variants.\n\n")
	}

	// Injected markdown (Project Context).
	if len(files) > 0 {
		b.WriteString("# 项目上下文\n\n")
		b.WriteString("已加载以下提示文件：\n\n")
		for _, f := range files {
			b.WriteString("## ")
			b.WriteString(f.Name)
			b.WriteString("\n\n")
			b.WriteString(f.Content)
			b.WriteString("\n\n")
		}
	}

	return strings.TrimSpace(b.String()), nil
}

// EnsureWorkspacePrompts ensures workspaceDir exists and copies default prompts.
//
// Default behavior (to avoid mixing generated files into system prompts):
//   - ensure prompt markdown lives under: <workspaceDir>/prompt/
//   - copy from promptSourceDir into <workspaceDir>/prompt/ when that dir has no .md files.
func EnsureWorkspacePrompts(workspaceDir, promptSourceDir string) error {
	promptDir := filepath.Join(workspaceDir, "prompt")
	if err := os.MkdirAll(promptDir, 0750); err != nil {
		return err
	}

	// Check if workspace prompt already has any .md files.
	entries, err := os.ReadDir(promptDir)
	if err != nil {
		return err
	}
	hasMD := false
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ".md") {
			hasMD = true
			break
		}
	}
	if hasMD {
		return nil
	}
	// Copy .md from promptSourceDir
	srcEntries, err := os.ReadDir(promptSourceDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, e := range srcEntries {
		if e.IsDir() || !strings.HasSuffix(strings.ToLower(e.Name()), ".md") {
			continue
		}
		name := e.Name()
		src := filepath.Join(promptSourceDir, name)
		dst := filepath.Join(promptDir, name)
		data, err := os.ReadFile(src)
		if err != nil {
			continue
		}
		if err := os.WriteFile(dst, data, 0640); err != nil {
			return err
		}
	}
	return nil
}
