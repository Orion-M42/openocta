package handlers

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"

	"github.com/openocta/openocta/pkg/gateway/protocol"
)

var skillAnalyzeJSONFenceRe = regexp.MustCompile("(?s)^```(?:json)?\\s*\\n(.*?)\\n```\\s*$")

// SkillAnalyzeResult is returned by AnalyzeSkillContent.
type SkillAnalyzeResult struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Category     string   `json:"category"`
	Tags         []string `json:"tags"`
	Summary      string   `json:"summary"`
	AllowedTools []string `json:"allowedTools"`
	Files        []string `json:"files"`
	SkillMD      string   `json:"skillMarkdown"`
}

func AnalyzeSkillContent(ctx context.Context, opts HandlerOpts, skillMarkdown string, files []string) (*SkillAnalyzeResult, error) {
	result := &SkillAnalyzeResult{
		Files:        files,
		SkillMD:      skillMarkdown,
		Name:         skillNameFromMarkdown(skillMarkdown),
		Description:  frontmatterFieldFromMarkdown(skillMarkdown, "description"),
		AllowedTools: parseAllowedToolsFromMarkdown(skillMarkdown),
		Tags:         []string{},
	}
	if result.Name == "" {
		result.Name = "my-skill"
	}

	prompt := formatSkillAnalyzePrompt(skillMarkdown, files)
	output, errShape := runSkillLLMPrompt(ctx, opts, "main", "analyze", prompt, resolveSkillLLMTimeoutMs(opts.Params, 90000))
	if errShape != nil {
		return result, nil
	}

	parsed := parseSkillAnalyzeJSON(output)
	if parsed == nil {
		return result, nil
	}
	if v := strings.TrimSpace(parsed.Name); v != "" {
		result.Name = v
	}
	if v := strings.TrimSpace(parsed.Description); v != "" {
		result.Description = v
	}
	if v := strings.TrimSpace(parsed.Category); v != "" {
		result.Category = v
	}
	if v := strings.TrimSpace(parsed.Summary); v != "" {
		result.Summary = v
	}
	if len(parsed.Tags) > 0 {
		result.Tags = parsed.Tags
	}
	if len(parsed.AllowedTools) > 0 {
		result.AllowedTools = parsed.AllowedTools
	}
	return result, nil
}

type skillAnalyzeJSON struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Category     string   `json:"category"`
	Tags         []string `json:"tags"`
	Summary      string   `json:"summary"`
	AllowedTools []string `json:"allowedTools"`
}

func parseSkillAnalyzeJSON(raw string) *skillAnalyzeJSON {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if m := skillAnalyzeJSONFenceRe.FindStringSubmatch(raw); len(m) > 1 {
		raw = strings.TrimSpace(m[1])
	}
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start >= 0 && end > start {
		raw = raw[start : end+1]
	}
	var out skillAnalyzeJSON
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return &out
}

func parseAllowedToolsFromMarkdown(markdown string) []string {
	raw := frontmatterFieldFromMarkdown(markdown, "allowed-tools")
	if raw == "" {
		return []string{}
	}
	raw = strings.Trim(raw, "[]\"'")
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(strings.Trim(p, "\"'"))
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

// SkillAnalyzeHandler handles "skills.analyze" — analyze SKILL.md content with LLM.
func SkillAnalyzeHandler(opts HandlerOpts) error {
	skillMarkdown, _ := opts.Params["skillMarkdown"].(string)
	filesRaw, _ := opts.Params["files"].([]interface{})
	files := make([]string, 0, len(filesRaw))
	for _, f := range filesRaw {
		if s, ok := f.(string); ok && strings.TrimSpace(s) != "" {
			files = append(files, strings.TrimSpace(s))
		}
	}
	if strings.TrimSpace(skillMarkdown) == "" {
		opts.Respond(false, nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeInvalidRequest,
			Message: "skills.analyze: skillMarkdown is required",
		}, nil)
		return nil
	}

	result, _ := AnalyzeSkillContent(context.Background(), opts, skillMarkdown, files)
	opts.Respond(true, result, nil, nil)
	return nil
}
