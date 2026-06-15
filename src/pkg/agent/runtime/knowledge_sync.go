package runtime

import (
	"context"
	"fmt"
	"os"

	"github.com/openocta/openocta/pkg/config"
	"github.com/stellarlinkco/agentsdk-go/pkg/skylark"
)

// RebuildKnowledgeIndex rescans the vault and rebuilds the shared Bleve index on disk.
func RebuildKnowledgeIndex(ctx context.Context, cfg *config.OpenOctaConfig, agentID string) (fileCount, chunkCount int, err error) {
	if ctx == nil {
		ctx = context.Background()
	}
	opts := resolveKnowledgeOptions(cfg, os.Getenv, agentID)
	if opts == nil || !opts.Enabled {
		return 0, 0, fmt.Errorf("knowledge is disabled")
	}
	docs, err := skylark.SyncVault(opts.VaultDir)
	if err != nil {
		return 0, 0, fmt.Errorf("sync vault: %w", err)
	}
	emb, err := skylark.NewEmbedderFromEnv()
	if err != nil {
		return 0, 0, fmt.Errorf("embedder: %w", err)
	}
	eng, err := skylark.NewEngine(opts.IndexDir, emb)
	if err != nil {
		return 0, 0, fmt.Errorf("open index: %w", err)
	}
	defer eng.Close()
	if err := eng.Rebuild(ctx, docs); err != nil {
		return 0, 0, fmt.Errorf("rebuild index: %w", err)
	}
	paths := map[string]struct{}{}
	for _, d := range docs {
		if p := d.Meta["path"]; p != "" {
			paths[p] = struct{}{}
		}
	}
	return len(paths), len(docs), nil
}
