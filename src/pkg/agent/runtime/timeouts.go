package runtime

import (
	"context"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/openocta/openocta/pkg/config"
	"github.com/stellarlinkco/agentsdk-go/pkg/api"
)

// 以下环境变量在 config.env.vars 通过 Options.Env 注入时同样生效。
const (
	// EnvAgentRunTimeout：单次 Run/RunStream 在传入的 context 尚未带 deadline 时追加的上限。
	// Go duration 语法（如 10m、600s、1h）或非负整数秒。未设置时默认 DefaultAgentRunTimeout。
	// 设为 0 表示不追加 deadline（可能无限等待，仅当 ctx 本身无超时）。
	EnvAgentRunTimeout = "OPENOCTA_AGENT_RUN_TIMEOUT"
	// EnvMiddlewareTimeout：agentsdk 每条 middleware 阶段的超时（api.Options.MiddlewareTimeout）。
	// 未设置或为 0 表示不限制（与 SDK 默认一致）。
	EnvMiddlewareTimeout = "OPENOCTA_MIDDLEWARE_TIMEOUT"
	// EnvHookTimeout：shell hook 执行默认超时（api.Options.HookTimeout）。
	// 未设置时传 0，由 agentsdk 内部使用其默认（约 600s）。
	EnvHookTimeout = "OPENOCTA_HOOK_TIMEOUT"
)

// DefaultAgentRunTimeout 与 gateway chat 默认 timeoutMs=600000 对齐。
const DefaultAgentRunTimeout = 10 * time.Minute

// lookupEnvMerged prefers config.env.vars[key] when it is present and non-empty (after trim),
// so UI 保存的 openocta.json 无需重启即可生效，且可覆盖仅启动时注入的旧 os 环境。
func lookupEnvMerged(cfg *config.OpenOctaConfig, base func(string) string, key string) string {
	if base == nil {
		base = os.Getenv
	}
	if cfg != nil && cfg.Env != nil && cfg.Env.Vars != nil {
		if v, ok := cfg.Env.Vars[key]; ok {
			v = strings.TrimSpace(v)
			if v != "" {
				return v
			}
		}
	}
	return strings.TrimSpace(base(key))
}

func getenv(opts Options, key string) string {
	base := os.Getenv
	if opts.Env != nil {
		base = opts.Env
	}
	return lookupEnvMerged(opts.Config, base, key)
}

// parseDurationOrSeconds 支持 time.ParseDuration；若为纯数字则按秒解析。
func parseDurationOrSeconds(s string) (time.Duration, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}
	if d, err := time.ParseDuration(s); err == nil {
		return d, true
	}
	if n, err := strconv.Atoi(s); err == nil && n >= 0 {
		return time.Duration(n) * time.Second, true
	}
	return 0, false
}

func resolveAgentRunTimeout(opts Options) time.Duration {
	if opts.AgentRunTimeout > 0 {
		return opts.AgentRunTimeout
	}
	v := getenv(opts, EnvAgentRunTimeout)
	if v != "" {
		d, ok := parseDurationOrSeconds(v)
		if !ok {
			return DefaultAgentRunTimeout
		}
		return d
	}
	return DefaultAgentRunTimeout
}

func resolveMiddlewareTimeout(opts Options) time.Duration {
	if opts.MiddlewareTimeout > 0 {
		return opts.MiddlewareTimeout
	}
	v := getenv(opts, EnvMiddlewareTimeout)
	if v == "" {
		return 0
	}
	d, ok := parseDurationOrSeconds(v)
	if !ok {
		return 0
	}
	return d
}

func resolveHookTimeout(opts Options) time.Duration {
	if opts.HookTimeout > 0 {
		return opts.HookTimeout
	}
	v := getenv(opts, EnvHookTimeout)
	if v == "" {
		return 0
	}
	d, ok := parseDurationOrSeconds(v)
	if !ok {
		return 0
	}
	return d
}

func applyAPITimeouts(apiOpts *api.Options, opts Options) {
	if apiOpts == nil {
		return
	}
	if mt := resolveMiddlewareTimeout(opts); mt > 0 {
		apiOpts.MiddlewareTimeout = mt
	}
	if ht := resolveHookTimeout(opts); ht > 0 {
		apiOpts.HookTimeout = ht
	}
	if d := resolveAgentRunTimeout(opts); d > 0 {
		apiOpts.Timeout = d
	}
}

// DefaultAgentRunDuration 返回单次运行预算（与 Run / gateway 默认超时同源）。
// cfg 非 nil 时先读 config.env.vars 再读 env；env 可为 nil（将使用 os.Getenv）。
func DefaultAgentRunDuration(env func(string) string, cfg *config.OpenOctaConfig) time.Duration {
	if env == nil {
		env = os.Getenv
	}
	return resolveAgentRunTimeout(Options{Env: env, Config: cfg})
}

func wrapRunContext(ctx context.Context, agentRunBudget time.Duration) (context.Context, context.CancelFunc) {
	if agentRunBudget <= 0 {
		return ctx, func() {}
	}
	if _, hasDeadline := ctx.Deadline(); hasDeadline {
		return ctx, func() {}
	}
	return context.WithTimeout(ctx, agentRunBudget)
}
