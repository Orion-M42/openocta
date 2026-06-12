package runtime

import (
	"path/filepath"
	"strings"

	"github.com/openocta/openocta/pkg/config"
)

// ResolvedCommandPolicy holds the merged command policy used at runtime.
// Built from commandPolicy (preferred) or legacy validator + approvalQueue.
type ResolvedCommandPolicy struct {
	Enabled        bool
	DefaultPolicy  string // "deny" | "ask" | "allow"
	DenyRules      []CommandRule
	AskRules       []CommandRule
	AllowRules     []CommandRule
	BanArguments   []string
	MaxLength      int
	SecretPatterns []string
}

// CommandRule is a single pattern rule.
type CommandRule struct {
	Pattern string
	Type    string // "command" | "fragment"
}

// ResolveCommandPolicy builds ResolvedCommandPolicy from config.
// Prefers commandPolicy when present; otherwise merges validator + approvalQueue.
func ResolveCommandPolicy(cfg *config.SecurityConfig) *ResolvedCommandPolicy {
	if cfg == nil {
		return nil
	}
	if cfg.CommandPolicy != nil {
		return resolveFromCommandPolicy(cfg.CommandPolicy)
	}
	return resolveFromLegacy(cfg)
}

func resolveFromCommandPolicy(cp *config.CommandPolicyConfig) *ResolvedCommandPolicy {
	r := &ResolvedCommandPolicy{
		Enabled:       cp.Enabled == nil || *cp.Enabled,
		DefaultPolicy: "ask",
		MaxLength:     4096,
	}
	if cp.DefaultPolicy != nil {
		switch *cp.DefaultPolicy {
		case "deny", "ask", "allow":
			r.DefaultPolicy = *cp.DefaultPolicy
		}
	}
	if cp.MaxLength != nil && *cp.MaxLength > 0 {
		r.MaxLength = *cp.MaxLength
	}
	if len(cp.BanArguments) > 0 {
		r.BanArguments = append([]string{}, cp.BanArguments...)
	}
	if len(cp.SecretPatterns) > 0 {
		r.SecretPatterns = append([]string{}, cp.SecretPatterns...)
	}
	// Prefer grouped Deny/Ask/Allow when present
	if len(cp.Deny) > 0 || len(cp.Ask) > 0 || len(cp.Allow) > 0 {
		for _, p := range cp.Deny {
			if p = strings.TrimSpace(p); p != "" {
				typ := "command"
				if strings.Contains(p, " ") {
					typ = "fragment"
				}
				r.DenyRules = append(r.DenyRules, CommandRule{Pattern: p, Type: typ})
			}
		}
		for _, p := range cp.Ask {
			if p = strings.TrimSpace(p); p != "" {
				r.AskRules = append(r.AskRules, CommandRule{Pattern: p, Type: "command"})
			}
		}
		for _, p := range cp.Allow {
			if p = strings.TrimSpace(p); p != "" {
				r.AllowRules = append(r.AllowRules, CommandRule{Pattern: p, Type: "command"})
			}
		}
		return r
	}
	// Fallback to legacy Rules array
	for _, rule := range cp.Rules {
		cr := CommandRule{Pattern: strings.TrimSpace(rule.Pattern), Type: rule.Type}
		if cr.Type == "" {
			cr.Type = "command"
		}
		switch rule.Action {
		case "deny":
			r.DenyRules = append(r.DenyRules, cr)
		case "ask":
			r.AskRules = append(r.AskRules, cr)
		case "allow":
			r.AllowRules = append(r.AllowRules, cr)
		}
	}
	return r
}

func resolveFromLegacy(cfg *config.SecurityConfig) *ResolvedCommandPolicy {
	r := &ResolvedCommandPolicy{
		Enabled:       true,
		DefaultPolicy: "ask",
		MaxLength:     4096,
	}
	// From validator
	if cfg.Validator != nil {
		v := cfg.Validator
		if v.Enabled != nil && !*v.Enabled {
			r.Enabled = false
		}
		if v.MaxLength != nil && *v.MaxLength > 0 {
			r.MaxLength = *v.MaxLength
		}
		for _, b := range v.BanCommands {
			if b != "" {
				r.DenyRules = append(r.DenyRules, CommandRule{Pattern: strings.TrimSpace(b), Type: "command"})
			}
		}
		for _, b := range v.BanFragments {
			if b != "" {
				r.DenyRules = append(r.DenyRules, CommandRule{Pattern: strings.TrimSpace(b), Type: "fragment"})
			}
		}
		if len(v.BanArguments) > 0 {
			r.BanArguments = append([]string{}, v.BanArguments...)
		}
		if len(v.SecretPatterns) > 0 {
			r.SecretPatterns = append(r.SecretPatterns, v.SecretPatterns...)
		}
	}
	// From approvalQueue allow/ask/deny (can override validator deny with explicit allow in approvalQueue)
	if cfg.ApprovalQueue != nil {
		aq := cfg.ApprovalQueue
		for _, p := range aq.Deny {
			if p != "" {
				r.DenyRules = append(r.DenyRules, CommandRule{Pattern: strings.TrimSpace(p), Type: "command"})
			}
		}
		for _, p := range aq.Ask {
			if p != "" {
				r.AskRules = append(r.AskRules, CommandRule{Pattern: strings.TrimSpace(p), Type: "command"})
			}
		}
		for _, p := range aq.Allow {
			if p != "" {
				r.AllowRules = append(r.AllowRules, CommandRule{Pattern: strings.TrimSpace(p), Type: "command"})
			}
		}
	}
	return r
}

// EvaluateCommand returns "deny" | "ask" | "allow" for the given command.
// Compound commands (&&, ||, ;) are evaluated per segment; the strictest action wins.
func (r *ResolvedCommandPolicy) EvaluateCommand(command string) string {
	action, _ := r.EvaluateCommandAccess(command)
	return action
}

// EvaluateCommandAccess returns the policy action and whether an explicit rule matched
// (as opposed to falling back to defaultPolicy).
func (r *ResolvedCommandPolicy) EvaluateCommandAccess(command string) (action string, explicitRule bool) {
	if r == nil || !r.Enabled {
		return "allow", false
	}
	segments := splitShellCommandSegments(command)
	if len(segments) == 0 {
		return "deny", false
	}
	worst := "allow"
	anyExplicit := false
	for _, segment := range segments {
		segAction, explicit := r.evaluateSingleCommandAccess(segment)
		if segAction == "deny" {
			return "deny", explicit
		}
		if segAction == "ask" {
			worst = "ask"
			if explicit {
				anyExplicit = true
			}
			continue
		}
		if worst != "ask" {
			worst = "allow"
		}
	}
	return worst, anyExplicit
}

func (r *ResolvedCommandPolicy) evaluateSingleCommandAccess(command string) (action string, explicitRule bool) {
	cmd := strings.TrimSpace(command)
	if cmd == "" {
		return "deny", false
	}
	lower := strings.ToLower(cmd)
	base := ""
	if parts := strings.Fields(cmd); len(parts) > 0 {
		base = filepath.Base(parts[0])
	}
	for _, rule := range r.DenyRules {
		if matchRule(cmd, lower, base, rule) {
			return "deny", true
		}
	}
	for _, rule := range r.AllowRules {
		if matchRule(cmd, lower, base, rule) {
			return "allow", true
		}
	}
	for _, rule := range r.AskRules {
		if matchRule(cmd, lower, base, rule) {
			return "ask", true
		}
	}
	return r.DefaultPolicy, false
}

func splitShellCommandSegments(command string) []string {
	cmd := strings.TrimSpace(command)
	if cmd == "" {
		return nil
	}
	parts := strings.FieldsFunc(cmd, func(r rune) bool {
		return r == '&' || r == '|' || r == ';'
	})
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		segment := strings.TrimSpace(part)
		if segment == "" {
			continue
		}
		out = append(out, segment)
	}
	if len(out) == 0 {
		return []string{cmd}
	}
	return out
}

func matchRule(cmd, lower, base string, rule CommandRule) bool {
	pat := strings.ToLower(strings.TrimSpace(rule.Pattern))
	if pat == "" {
		return false
	}
	switch rule.Type {
	case "fragment":
		return strings.Contains(lower, pat)
	default:
		return strings.EqualFold(base, pat) || strings.HasPrefix(lower, pat+" ")
	}
}

// readOnlyShellCommands are safe diagnostics that should not block on approval queues.
var readOnlyShellCommands = map[string]struct{}{
	"ls": {}, "pwd": {}, "echo": {}, "printf": {}, "cat": {}, "wc": {},
	"head": {}, "tail": {}, "stat": {}, "file": {}, "du": {}, "df": {},
	"hostname": {}, "uname": {}, "whoami": {}, "id": {}, "date": {}, "env": {},
	"printenv": {}, "which": {}, "type": {}, "true": {}, "false": {},
}

// benignWriteShellCommands are non-interactive workspace mutations that should not
// stall on approval queues (mkdir -p, touch, copy/move within sandbox, etc.).
var benignWriteShellCommands = map[string]struct{}{
	"mkdir": {}, "touch": {}, "cp": {}, "mv": {}, "ln": {}, "rmdir": {},
	"install": {}, "truncate": {}, "mktemp": {},
}

func isReadOnlyShellSegment(segment string) bool {
	cmd := strings.TrimSpace(segment)
	if cmd == "" {
		return false
	}
	parts := strings.Fields(cmd)
	if len(parts) == 0 {
		return false
	}
	base := strings.ToLower(filepath.Base(parts[0]))
	_, ok := readOnlyShellCommands[base]
	return ok
}

func isBenignWriteShellSegment(segment string) bool {
	cmd := strings.TrimSpace(segment)
	if cmd == "" {
		return false
	}
	parts := strings.Fields(cmd)
	if len(parts) == 0 {
		return false
	}
	base := strings.ToLower(filepath.Base(parts[0]))
	_, ok := benignWriteShellCommands[base]
	return ok
}

func isAutoAllowShellSegment(segment string) bool {
	return isReadOnlyShellSegment(segment) || isBenignWriteShellSegment(segment)
}

// ToLegacyValidator converts to SandboxValidatorConfig for ValidateCommandWithConfig.
// Used when we need to reject (deny) before tool execution.
func (r *ResolvedCommandPolicy) ToLegacyValidator() *config.SandboxValidatorConfig {
	if r == nil || !r.Enabled {
		return nil
	}
	v := &config.SandboxValidatorConfig{
		Enabled:        ptr(true),
		BanCommands:    []string{},
		BanFragments:   []string{},
		BanArguments:   r.BanArguments,
		MaxLength:      &r.MaxLength,
		SecretPatterns: r.SecretPatterns,
	}
	for _, rule := range r.DenyRules {
		if rule.Type == "fragment" {
			v.BanFragments = append(v.BanFragments, rule.Pattern)
		} else {
			v.BanCommands = append(v.BanCommands, rule.Pattern)
		}
	}
	return v
}

// ToApprovalQueuePerms returns allow/ask/deny slices for SDK permissions config.
func (r *ResolvedCommandPolicy) ToApprovalQueuePerms() (allow, ask, deny []string) {
	if r == nil || !r.Enabled {
		return nil, nil, nil
	}
	for _, rule := range r.AllowRules {
		if rule.Pattern != "" {
			allow = append(allow, rule.Pattern)
		}
	}
	for _, rule := range r.AskRules {
		if rule.Pattern != "" {
			ask = append(ask, rule.Pattern)
		}
	}
	for _, rule := range r.DenyRules {
		if rule.Pattern != "" {
			deny = append(deny, rule.Pattern)
		}
	}
	return allow, ask, deny
}

func ptr[T any](v T) *T {
	return &v
}
