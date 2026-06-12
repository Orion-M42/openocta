package handlers

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/openocta/openocta/pkg/agent"
	"github.com/openocta/openocta/pkg/agent/runtime"
	"github.com/openocta/openocta/pkg/gateway/protocol"
	"github.com/openocta/openocta/pkg/session"
	"github.com/stellarlinkco/agentsdk-go/pkg/api"
)

const chatExtractSkillPromptTemplate = `你是一名 Agent Skill 作者。请根据下面的对话记录，提炼出一个可复用的 SKILL.md 技能文档。

要求：
1. 输出必须是完整的 Markdown，且以 YAML frontmatter 开头（--- 包裹）。
2. frontmatter 至少包含 name（小写短横线标识）和 description（一句话说明用途）。
3. 正文用中文，结构清晰：适用场景、操作步骤、注意事项、示例（如有）。
4. 只提炼对话中反复出现或关键的工作流/领域知识，不要编造对话里没有的内容。
5. 不要输出代码围栏外的解释文字，只输出 SKILL.md 全文。

对话记录：
%s`

var chatExtractSkillFenceRe = regexp.MustCompile("(?s)^```(?:markdown|md)?\\s*\\n(.*?)\\n```\\s*$")

// ChatExtractSkillHandler handles "chat.extractSkill" — distill conversation history into a SKILL.md markdown.
func ChatExtractSkillHandler(opts HandlerOpts) error {
	sessionKey, _ := opts.Params["sessionKey"].(string)
	sessionKey = strings.TrimSpace(strings.ToLower(sessionKey))
	if sessionKey == "" {
		sessionKey = "main"
	}

	sessionID, sessionFile, storePath, err := ResolveChatSessionID(opts.Params, opts.Context)
	if err != nil {
		opts.Respond(false, nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeInvalidRequest,
			Message: "chat.extractSkill: invalid session: " + err.Error(),
		}, nil)
		return nil
	}

	env := func(k string) string { return os.Getenv(k) }
	cfg := loadConfigFromContext(opts.Context)
	target := resolveGatewaySessionStoreTarget(cfg, sessionKey, env)
	transcriptPath := resolveSessionTranscriptPath(sessionID, storePath, sessionFile, target.agentID, env)

	msgs, err := session.ReadTranscriptMessages(transcriptPath, 0)
	if err != nil {
		for _, alt := range resolveSessionTranscriptCandidates(sessionID, storePath, sessionFile, target.agentID, env) {
			if alt == transcriptPath {
				continue
			}
			if m2, e2 := session.ReadTranscriptMessages(alt, 0); e2 == nil {
				msgs, err = m2, nil
				break
			}
		}
	}
	if err != nil || len(msgs) == 0 {
		opts.Respond(false, nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeInvalidRequest,
			Message: "chat.extractSkill: no conversation history to extract",
		}, nil)
		return nil
	}

	conversation := formatTranscriptForSkillExtract(msgs)
	if strings.TrimSpace(conversation) == "" {
		opts.Respond(false, nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeInvalidRequest,
			Message: "chat.extractSkill: conversation has no extractable text",
		}, nil)
		return nil
	}

	agentID := agent.ResolveSessionAgentID(sessionKey)
	projectRoot := "."
	if cfg != nil {
		projectRoot = agent.ResolveAgentWorkspaceDir(cfg, agentID, env)
		if projectRoot == "" {
			projectRoot = "."
		}
	}

	timeoutMs := 120000
	if t, ok := opts.Params["timeoutMs"].(float64); ok && t > 0 {
		timeoutMs = int(t)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()

	var modelFactory api.ModelFactory
	if cfg != nil {
		factory, factoryErr := agent.CreateModelFactoryFromConfig(cfg, agentID)
		if factoryErr != nil {
			opts.Respond(false, nil, &protocol.ErrorShape{
				Code:    protocol.ErrCodeServiceUnavailable,
				Message: "chat.extractSkill: " + factoryErr.Error(),
			}, nil)
			return nil
		}
		modelFactory = factory
	} else {
		modelFactory = runtime.DefaultModelFactory()
	}

	emptyFilter := []string{}
	webToolsOff := false
	rtOpts := runtime.Options{
		ModelFactory:       modelFactory,
		ProjectRoot:        projectRoot,
		Config:             cfg,
		EnableSkills:       false,
		EnableSubagents:    false,
		EnableSandbox:      false,
		EnableSystemPrompt: false,
		SkillFilter:        &emptyFilter,
		McpServerFilter:    &emptyFilter,
		EnableWebTools:     &webToolsOff,
		AgentID:            agentID,
		Env:                env,
	}
	rt, err := runtime.New(ctx, rtOpts)
	if err != nil {
		opts.Respond(false, nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeServiceUnavailable,
			Message: "chat.extractSkill: runtime: " + err.Error(),
		}, nil)
		return nil
	}
	defer rt.Close()

	prompt := fmt.Sprintf(chatExtractSkillPromptTemplate, conversation)
	resp, runErr := rt.Run(ctx, api.Request{Prompt: prompt, SessionID: sessionID + ":extract-skill"})
	if runErr != nil {
		opts.Respond(false, nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeInternal,
			Message: "chat.extractSkill: " + runErr.Error(),
		}, nil)
		return nil
	}

	markdown := ""
	if resp != nil && resp.Result != nil {
		markdown = strings.TrimSpace(resp.Result.Output)
	}
	markdown = normalizeExtractedSkillMarkdown(markdown)
	if markdown == "" {
		opts.Respond(false, nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeInternal,
			Message: "chat.extractSkill: model returned empty skill document",
		}, nil)
		return nil
	}

	filename := "extracted-skill.md"
	if name := skillNameFromMarkdown(markdown); name != "" {
		filename = name + ".md"
	}

	opts.Respond(true, map[string]interface{}{
		"markdown": markdown,
		"filename": filename,
	}, nil, nil)
	return nil
}

func formatTranscriptForSkillExtract(msgs []session.TranscriptMessage) string {
	var b strings.Builder
	for _, m := range msgs {
		role := strings.TrimSpace(m.Role)
		if role == "" || role == "system" || role == "toolResult" || role == "tool" {
			continue
		}
		text := transcriptPlainText(m)
		if strings.TrimSpace(text) == "" {
			continue
		}
		label := role
		switch role {
		case "user":
			label = "用户"
		case "assistant":
			label = "助手"
		}
		b.WriteString("### ")
		b.WriteString(label)
		b.WriteString("\n\n")
		b.WriteString(strings.TrimSpace(text))
		b.WriteString("\n\n")
	}
	return b.String()
}

func transcriptPlainText(m session.TranscriptMessage) string {
	var parts []string
	for _, block := range m.Content {
		switch block.Type {
		case "text":
			if t := strings.TrimSpace(block.Text); t != "" {
				parts = append(parts, t)
			}
		case "thinking":
			if t := strings.TrimSpace(block.Thinking); t != "" {
				parts = append(parts, "[思考] "+t)
			}
		}
	}
	return strings.Join(parts, "\n")
}

func normalizeExtractedSkillMarkdown(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if m := chatExtractSkillFenceRe.FindStringSubmatch(raw); len(m) > 1 {
		return strings.TrimSpace(m[1])
	}
	if strings.HasPrefix(raw, "```") {
		lines := strings.Split(raw, "\n")
		if len(lines) >= 2 && strings.HasPrefix(lines[0], "```") {
			end := len(lines) - 1
			for end > 0 && !strings.HasPrefix(strings.TrimSpace(lines[end]), "```") {
				end--
			}
			if end > 1 {
				return strings.TrimSpace(strings.Join(lines[1:end], "\n"))
			}
		}
	}
	return raw
}

func skillNameFromMarkdown(markdown string) string {
	lines := strings.Split(markdown, "\n")
	if len(lines) < 3 || strings.TrimSpace(lines[0]) != "---" {
		return ""
	}
	for i := 1; i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) == "---" {
			break
		}
		line := strings.TrimSpace(lines[i])
		if strings.HasPrefix(line, "name:") {
			return strings.TrimSpace(strings.TrimPrefix(line, "name:"))
		}
	}
	return ""
}
