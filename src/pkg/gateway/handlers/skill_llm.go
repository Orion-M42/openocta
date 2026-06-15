package handlers

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/openocta/openocta/pkg/agent"
	"github.com/openocta/openocta/pkg/agent/runtime"
	"github.com/openocta/openocta/pkg/gateway/protocol"
	"github.com/stellarlinkco/agentsdk-go/pkg/api"
)

func resolveSkillLLMTimeoutMs(params map[string]interface{}, defaultMs int) int {
	if t, ok := params["timeoutMs"].(float64); ok && t > 0 {
		return int(t)
	}
	return defaultMs
}

func newSkillLLMRuntime(ctx context.Context, opts HandlerOpts, agentID string) (*runtime.Runtime, func(), *protocol.ErrorShape) {
	env := func(k string) string { return os.Getenv(k) }
	cfg := loadConfigFromContext(opts.Context)
	projectRoot := "."
	if cfg != nil {
		projectRoot = agent.ResolveAgentWorkspaceDir(cfg, agentID, env)
		if projectRoot == "" {
			projectRoot = "."
		}
	}

	var modelFactory api.ModelFactory
	if cfg != nil {
		factory, factoryErr := agent.CreateModelFactoryFromConfig(cfg, agentID)
		if factoryErr != nil {
			return nil, nil, &protocol.ErrorShape{
				Code:    protocol.ErrCodeServiceUnavailable,
				Message: factoryErr.Error(),
			}
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
		DisableTools:       true,
		SkillFilter:        &emptyFilter,
		McpServerFilter:    &emptyFilter,
		EnableWebTools:     &webToolsOff,
		AgentID:            agentID,
		Env:                env,
	}
	rt, err := runtime.New(ctx, rtOpts)
	if err != nil {
		return nil, nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeServiceUnavailable,
			Message: "runtime: " + err.Error(),
		}
	}
	return rt, func() { rt.Close() }, nil
}

func runSkillLLMPrompt(ctx context.Context, opts HandlerOpts, agentID, sessionSuffix, prompt string, timeoutMs int) (string, *protocol.ErrorShape) {
	if timeoutMs <= 0 {
		timeoutMs = 120000
	}
	runCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()

	rt, cleanup, errShape := newSkillLLMRuntime(runCtx, opts, agentID)
	if errShape != nil {
		return "", errShape
	}
	defer cleanup()

	sessionID := fmt.Sprintf("skill-llm:%s:%d", sessionSuffix, time.Now().UnixNano())
	resp, runErr := rt.Run(runCtx, api.Request{Prompt: prompt, SessionID: sessionID})
	if runErr != nil {
		return "", &protocol.ErrorShape{
			Code:    protocol.ErrCodeInternal,
			Message: runErr.Error(),
		}
	}
	out := ""
	if resp != nil && resp.Result != nil {
		out = resp.Result.Output
	}
	out = strings.TrimSpace(out)
	if out == "" {
		return "", &protocol.ErrorShape{
			Code:    protocol.ErrCodeInternal,
			Message: "模型未返回文本内容，请检查 API Key 与默认模型配置",
		}
	}
	return out, nil
}
