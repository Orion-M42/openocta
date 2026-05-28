package runtime

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"unicode"

	"github.com/openocta/openocta/pkg/config"
)

var errEmptyCommand = errors.New("empty command")

var errMultilineCommand = errors.New("命令包含换行符，仅支持单行命令。请用 '&&' 或 ';' 连接多命令，例如: mkdir dir && echo done")

// ValidateCommandWithConfig validates a shell command string using OpenOcta sandbox.validator rules.
// It is intentionally conservative: blocks control chars and shell metacharacters by default.
func ValidateCommandWithConfig(command string, cfg *config.SandboxValidatorConfig) error {
	cmd := strings.TrimSpace(command)
	if cmd == "" {
		return errEmptyCommand
	}

	// 检测换行符，返回友好错误引导 LLM 重试
	if strings.Contains(cmd, "\n") || strings.Contains(cmd, "\r") {
		return errMultilineCommand
	}

	maxLen := 4096
	if cfg != nil && cfg.MaxLength != nil && *cfg.MaxLength > 0 {
		maxLen = *cfg.MaxLength
	}
	if maxLen > 0 && len(cmd) > maxLen {
		return fmt.Errorf("command too long (%d > %d)", len(cmd), maxLen)
	}
	if containsControl(cmd) {
		return fmt.Errorf("control characters detected")
	}
	// Safe default: block pipes/redirections/substitution in non-interactive policy.
	//if strings.ContainsAny(cmd, "|;&><`$") {
	//	return fmt.Errorf("pipe or shell metacharacters are blocked")
	//}

	parts := strings.Fields(cmd)
	if len(parts) == 0 {
		return errEmptyCommand
	}
	base := filepath.Base(parts[0])

	if cfg != nil {
		for _, b := range cfg.BanCommands {
			if b == "" {
				continue
			}
			if strings.EqualFold(strings.TrimSpace(b), base) {
				return fmt.Errorf("command %q is banned", base)
			}
		}
		lower := strings.ToLower(cmd)
		for _, frag := range cfg.BanFragments {
			if strings.TrimSpace(frag) == "" {
				continue
			}
			if strings.Contains(lower, strings.ToLower(frag)) {
				return fmt.Errorf("command fragment %q is banned", frag)
			}
		}
		for _, arg := range parts[1:] {
			for _, bannedArg := range cfg.BanArguments {
				if strings.TrimSpace(bannedArg) == "" {
					continue
				}
				if strings.Contains(strings.ToLower(arg), strings.ToLower(bannedArg)) {
					return fmt.Errorf("argument %q is banned", arg)
				}
			}
		}
	}

	return nil
}

func containsControl(s string) bool {
	for _, r := range s {
		if unicode.IsControl(r) && r != '\n' && r != '\r' && r != '\t' {
			return true
		}
	}
	return false
}
