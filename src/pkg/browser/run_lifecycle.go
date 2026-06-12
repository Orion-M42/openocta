package browser

import (
	"context"
	"strings"
	"sync"

	"github.com/openocta/openocta/pkg/config"
)

var (
	browserRunMu sync.Mutex
	browserRuns  = map[string]struct{}{}
)

// MarkRunUsingBrowser records that a chat/agent run started the bundled browser.
func MarkRunUsingBrowser(runID string) {
	runID = strings.TrimSpace(runID)
	if runID == "" {
		return
	}
	browserRunMu.Lock()
	browserRuns[runID] = struct{}{}
	browserRunMu.Unlock()
}

func runUsedBrowser(runID string) bool {
	runID = strings.TrimSpace(runID)
	if runID == "" {
		return false
	}
	browserRunMu.Lock()
	_, ok := browserRuns[runID]
	if ok {
		delete(browserRuns, runID)
	}
	browserRunMu.Unlock()
	return ok
}

// StopForRun closes Chromium when the given run had used the browser tool.
func StopForRun(ctx context.Context, cfg *config.OpenOctaConfig, env func(string) string, runID string) {
	if !runUsedBrowser(runID) {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}
	svc := DefaultService(cfg, env)
	_, _ = svc.stop(ctx)
}
