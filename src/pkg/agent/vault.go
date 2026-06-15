package agent

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/openocta/openocta/pkg/config"
	"github.com/openocta/openocta/pkg/paths"
)

const VaultReadmeTemplate = "# OpenOcta Knowledge Vault\n\n" +
	"This folder is your Obsidian-compatible knowledge base. Add .md notes here; the agent indexes them for memory_search.\n\n" +
	"- Open this directory in [Obsidian](https://obsidian.md) to browse and edit notes.\n" +
	"- Subfolders are supported; .obsidian/ is ignored by the indexer.\n"

// ResolveVaultDir returns the Obsidian-compatible vault directory for an agent.
func ResolveVaultDir(cfg *config.OpenOctaConfig, agentID string, env func(string) string) string {
	if env == nil {
		env = os.Getenv
	}
	if cfg != nil && cfg.Agents != nil && cfg.Agents.Defaults != nil && cfg.Agents.Defaults.Knowledge != nil {
		if d := strings.TrimSpace(derefString(cfg.Agents.Defaults.Knowledge.VaultDir)); d != "" {
			return d
		}
	}
	stateDir := paths.ResolveStateDir(env)
	vaultDir := filepath.Join(stateDir, "vault")
	if cfg != nil && cfg.Agents != nil {
		ws := strings.TrimSpace(ResolveAgentWorkspaceDir(cfg, agentID, env))
		if ws != "" {
			vaultDir = filepath.Join(ws, "vault")
		}
	}
	return vaultDir
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// EnsureVaultDir creates the vault directory and seeds README.md when missing.
func EnsureVaultDir(vaultDir string) {
	if strings.TrimSpace(vaultDir) == "" {
		return
	}
	_ = os.MkdirAll(vaultDir, 0o755)
	readme := filepath.Join(vaultDir, "README.md")
	if _, err := os.Stat(readme); os.IsNotExist(err) {
		_ = os.WriteFile(readme, []byte(VaultReadmeTemplate), 0o644)
	}
}
