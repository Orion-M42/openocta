package handlers

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/openocta/openocta/pkg/agent"
	"github.com/openocta/openocta/pkg/gateway/protocol"
)

const skillComposeSystemPrompt = `你是 Skill 创作助手，帮助用户把想法整理成可发布的 Agent Skill（SKILL.md）。

规则：
1. 用中文与用户对话，必要时追问：用途、触发场景、所需工具、关键步骤。
2. 当信息足够生成或更新草稿时，在回复末尾附上完整的 SKILL.md，用 markdown 代码围栏包裹。
3. SKILL.md 必须以 YAML frontmatter 开头（--- 包裹），至少包含 name（小写字母/数字/连字符）、description、allowed-tools。
4. 正文结构清晰：适用场景、操作步骤、注意事项、示例（如有）。
5. 不要编造用户未提及的关键能力；不确定时先追问。
6. 围栏外的文字是你的对话回复；围栏内只放 SKILL.md 全文。`

const skillAuthoringGuideFallback = `# Skill 创作参考

## Frontmatter 示例
---
name: my-example-skill
description: 一句话说明该 Skill 的用途与触发场景
allowed-tools: Read, Grep, Bash
---

## 正文建议结构
- 适用场景：何时应激活此 Skill
- 操作步骤：分步骤说明 Agent 应如何执行
- 注意事项：边界、禁止事项、失败处理
- 示例（可选）：输入/输出样例
`

func resolveSkillAuthoringGuide(opts HandlerOpts) string {
	env := func(k string) string { return os.Getenv(k) }
	managed := ResolveManagedSkillsDir(env)
	candidates := []string{
		filepath.Join(managed, "skill-create", "SKILL.md"),
		filepath.Join(managed, "skill-authoring", "SKILL.md"),
	}
	if bundled := strings.TrimSpace(os.Getenv("OPENCLAW_BUNDLED_SKILLS_DIR")); bundled != "" {
		candidates = append(candidates,
			filepath.Join(bundled, "skill-create", "SKILL.md"),
			filepath.Join(bundled, "skill-authoring", "SKILL.md"),
		)
	}
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err == nil && strings.TrimSpace(string(data)) != "" {
			return strings.TrimSpace(string(data))
		}
	}
	return skillAuthoringGuideFallback
}

type SkillComposeMessage struct {
	Role    string
	Content string
}

type skillComposeMessage = SkillComposeMessage

func parseSkillComposeMessages(raw interface{}) []SkillComposeMessage {
	arr, ok := raw.([]interface{})
	if !ok {
		return nil
	}
	out := make([]SkillComposeMessage, 0, len(arr))
	for _, item := range arr {
		m, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		role, _ := m["role"].(string)
		content, _ := m["content"].(string)
		role = strings.TrimSpace(strings.ToLower(role))
		content = strings.TrimSpace(content)
		if role == "" || content == "" {
			continue
		}
		if role != "user" && role != "assistant" {
			continue
		}
		out = append(out, SkillComposeMessage{Role: role, Content: content})
	}
	return out
}

func buildSkillComposePrompt(messages []SkillComposeMessage, draft, scenario, upgradeSkillKey, authoringGuide string) string {
	var b strings.Builder
	b.WriteString(skillComposeSystemPrompt)
	b.WriteString("\n\n## Skill 创作参考\n\n")
	b.WriteString(strings.TrimSpace(authoringGuide))
	b.WriteString("\n\n")
	if scenario == "upgrade" && strings.TrimSpace(upgradeSkillKey) != "" {
		b.WriteString("创作场景：基于已有 Skill「")
		b.WriteString(strings.TrimSpace(upgradeSkillKey))
		b.WriteString("」迭代升级，生成新版本草稿。\n\n")
	} else {
		b.WriteString("创作场景：从零开始自由创作全新 Skill。\n\n")
	}
	if strings.TrimSpace(draft) != "" {
		b.WriteString("当前 SKILL.md 草稿：\n```markdown\n")
		b.WriteString(strings.TrimSpace(draft))
		b.WriteString("\n```\n\n")
	}
	if len(messages) == 0 {
		b.WriteString("用户尚未发送消息。请简短自我介绍并引导用户描述想创建的 Skill。\n")
		return b.String()
	}
	b.WriteString("对话记录：\n")
	for _, m := range messages {
		label := "用户"
		if m.Role == "assistant" {
			label = "助手"
		}
		b.WriteString("### ")
		b.WriteString(label)
		b.WriteString("\n\n")
		b.WriteString(m.Content)
		b.WriteString("\n\n")
	}
	b.WriteString("请继续对话。若可输出或更新 SKILL.md 草稿，务必在回复末尾用 markdown 围栏附上完整 SKILL.md。\n")
	return b.String()
}

func skillComposeReady(draft string) bool {
	d := strings.TrimSpace(draft)
	if !strings.HasPrefix(d, "---") {
		return false
	}
	name := skillNameFromMarkdown(d)
	desc := frontmatterFieldFromMarkdown(d, "description")
	return name != "" && desc != ""
}

func frontmatterFieldFromMarkdown(markdown, field string) string {
	lines := strings.Split(markdown, "\n")
	if len(lines) < 3 || strings.TrimSpace(lines[0]) != "---" {
		return ""
	}
	prefix := field + ":"
	for i := 1; i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) == "---" {
			break
		}
		line := strings.TrimSpace(lines[i])
		if strings.HasPrefix(line, prefix) {
			return strings.TrimSpace(strings.TrimPrefix(line, prefix))
		}
	}
	return ""
}

func extractReplyAndDraft(output string) (reply, draft string) {
	raw := strings.TrimSpace(output)
	if raw == "" {
		return "", ""
	}
	start := strings.Index(raw, "```")
	if start == -1 {
		return raw, ""
	}
	reply = strings.TrimSpace(raw[:start])
	fenced := raw[start:]
	draft = normalizeExtractedSkillMarkdown(fenced)
	if draft == "" {
		draft = normalizeExtractedSkillMarkdown(raw)
		if draft != "" && strings.HasPrefix(draft, "---") {
			reply = strings.TrimSpace(strings.TrimSuffix(raw, fenced))
		} else {
			draft = ""
		}
	}
	if reply == "" && draft != "" {
		reply = "已为你生成 SKILL.md 草稿，可在右侧预览。"
	}
	if reply == "" {
		reply = raw
	}
	return reply, draft
}

// ComposeSkill runs the skill authoring LLM turn and returns reply/draft payload.
func ComposeSkill(ctx context.Context, opts HandlerOpts, messages []SkillComposeMessage, draft, scenario, upgradeSkillKey string, timeoutMs int) (map[string]interface{}, *protocol.ErrorShape) {
	if scenario != "upgrade" {
		scenario = "free"
	}
	if len(messages) == 0 {
		return nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeInvalidRequest,
			Message: "messages is required",
		}
	}

	sessionKey, _ := opts.Params["sessionKey"].(string)
	sessionKey = strings.TrimSpace(strings.ToLower(sessionKey))
	if sessionKey == "" {
		sessionKey = "main"
	}
	agentID := agent.ResolveSessionAgentID(sessionKey)

	if timeoutMs <= 0 {
		timeoutMs = resolveSkillLLMTimeoutMs(opts.Params, 120000)
	}
	authoringGuide := resolveSkillAuthoringGuide(opts)
	prompt := buildSkillComposePrompt(messages, draft, scenario, upgradeSkillKey, authoringGuide)

	output, errShape := runSkillLLMPrompt(ctx, opts, agentID, "compose", prompt, timeoutMs)
	if errShape != nil {
		return nil, errShape
	}

	reply, newDraft := extractReplyAndDraft(output)
	if newDraft == "" {
		newDraft = strings.TrimSpace(draft)
	}

	files := []map[string]interface{}{}
	if newDraft != "" {
		files = append(files, map[string]interface{}{
			"path":    "SKILL.md",
			"content": newDraft,
		})
	}

	return map[string]interface{}{
		"reply": reply,
		"draft": newDraft,
		"files": files,
		"ready": skillComposeReady(newDraft),
	}, nil
}

// SkillComposeHandler handles "skills.compose" — conversational Skill authoring.
func SkillComposeHandler(opts HandlerOpts) error {
	messages := parseSkillComposeMessages(opts.Params["messages"])
	draft, _ := opts.Params["draft"].(string)
	scenario, _ := opts.Params["scenario"].(string)
	upgradeSkillKey, _ := opts.Params["upgradeSkillKey"].(string)
	timeoutMs := resolveSkillLLMTimeoutMs(opts.Params, 120000)

	result, errShape := ComposeSkill(context.Background(), opts, messages, draft, scenario, upgradeSkillKey, timeoutMs)
	if errShape != nil {
		opts.Respond(false, nil, errShape, nil)
		return nil
	}
	opts.Respond(true, result, nil, nil)
	return nil
}

func formatSkillAnalyzePrompt(skillMarkdown string, fileList []string) string {
	return fmt.Sprintf(`你是一名 Agent Skill 分析助手。请阅读下面的 SKILL.md 与压缩包文件列表，输出 JSON（不要 markdown 围栏），字段：
- name: 小写字母/数字/连字符的技能标识（可从 frontmatter 读取或推断）
- description: 一句话中文描述
- category: 中文分类（如「开发工具」「数据处理」「办公效率」等，单值）
- tags: 字符串数组，2-5 个中文标签
- summary: 2-3 句中文摘要，说明适用场景与价值
- allowedTools: 字符串数组（从 frontmatter allowed-tools 解析，没有则 []）

压缩包文件：
%s

SKILL.md 内容：
%s`, strings.Join(fileList, "\n"), skillMarkdown)
}
