package browser

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/utils"
	"github.com/openocta/openocta/pkg/paths"
)

// ResolveRodBrowserRootDir is where Rod downloads Chromium (HostGoogle / HostNPM race).
func ResolveRodBrowserRootDir(env func(string) string) string {
	if env == nil {
		env = os.Getenv
	}
	return filepath.Join(paths.ResolveStateDir(env), "browser", "rod")
}

// ResolveChromiumInstallDir is the legacy Chrome-for-Testing layout (still scanned for older installs).
func ResolveChromiumInstallDir(env func(string) string) string {
	if env == nil {
		env = os.Getenv
	}
	return filepath.Join(paths.ResolveStateDir(env), "browser", "chromium")
}

func newRodBrowser(env func(string) string, ctx context.Context) *launcher.Browser {
	b := launcher.NewBrowser()
	if ctx == nil {
		ctx = context.Background()
	}
	b.Context = ctx
	b.RootDir = ResolveRodBrowserRootDir(env)
	b.Hosts = []launcher.Host{launcher.HostGoogle, launcher.HostNPM, launcher.HostPlaywright}
	b.Logger = utils.LoggerQuiet
	return b
}

// InstallChromium downloads Chromium via Rod (Google / NPM / Playwright host race).
func InstallChromium(ctx context.Context, env func(string) string, report func(InstallProgress)) error {
	if env == nil {
		env = os.Getenv
	}
	b := newRodBrowser(env, ctx)

	if b.Validate() == nil {
		setInstallProgress(report, "done", 100, fmt.Sprintf("Chromium 已安装 (revision %d)", b.Revision))
		return nil
	}

	setInstallProgress(report, "download", 5, "正在竞速下载 Chromium（Google / NPM 镜像）…")
	_ = os.RemoveAll(b.Dir())

	progressDone := make(chan struct{})
	go runInstallProgressTicker(ctx, progressDone, report)
	defer close(progressDone)

	if err := b.Download(); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return fmt.Errorf("rod chromium download: %w", err)
	}

	bin := b.BinPath()
	if err := validateChromiumExecutable(bin); err != nil {
		return err
	}
	setInstallProgress(report, "done", 100, fmt.Sprintf("Chromium 安装完成 (revision %d)", b.Revision))
	return nil
}

func runInstallProgressTicker(ctx context.Context, done <-chan struct{}, report func(InstallProgress)) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	pct := 10
	for {
		select {
		case <-ctx.Done():
			return
		case <-done:
			return
		case <-ticker.C:
			if pct < 90 {
				pct += 5
			}
			setInstallProgress(report, "download", pct, "正在竞速下载 Chromium（Google / NPM 镜像）…")
		}
	}
}

type InstallProgress struct {
	Phase   string `json:"phase"`
	Percent int    `json:"percent"`
	Message string `json:"message"`
}

type InstallJob struct {
	mu       sync.Mutex
	running  bool
	done     bool
	err      string
	progress InstallProgress
	cancel   context.CancelFunc
}

var globalInstallJob InstallJob

func setInstallProgress(report func(InstallProgress), phase string, percent int, message string) {
	p := InstallProgress{Phase: phase, Percent: percent, Message: message}
	if report != nil {
		report(p)
	}
	globalInstallJob.mu.Lock()
	globalInstallJob.progress = p
	globalInstallJob.mu.Unlock()
}

// InstallStatus reports whether Chromium is available and any in-flight install job.
func InstallStatus(env func(string) string) map[string]interface{} {
	if env == nil {
		env = os.Getenv
	}
	out := map[string]interface{}{
		"ok":             true,
		"downloadMethod": "rod",
	}
	rodRoot := ResolveRodBrowserRootDir(env)
	out["installDir"] = rodRoot
	out["legacyInstallDir"] = ResolveChromiumInstallDir(env)
	out["rodRevision"] = launcher.RevisionDefault

	b := newRodBrowser(env, context.Background())
	if b.Validate() != nil {
		if info, err := os.Stat(b.Dir()); err == nil && info.IsDir() {
			out["partialDownload"] = true
		}
	}

	if bin, err := ResolveChromiumExecutable(nil, env); err == nil {
		out["installed"] = true
		out["executablePath"] = bin
	} else {
		out["installed"] = false
		out["chromiumError"] = err.Error()
	}
	globalInstallJob.mu.Lock()
	defer globalInstallJob.mu.Unlock()
	out["installing"] = globalInstallJob.running
	out["installDone"] = globalInstallJob.done
	if globalInstallJob.err != "" {
		out["installError"] = globalInstallJob.err
	}
	if globalInstallJob.progress.Message != "" {
		out["progress"] = globalInstallJob.progress
	}
	return out
}

// CancelInstallChromium aborts an in-flight Chromium download and removes partial files.
func CancelInstallChromium(env func(string) string) bool {
	if env == nil {
		env = os.Getenv
	}
	globalInstallJob.mu.Lock()
	if !globalInstallJob.running {
		globalInstallJob.mu.Unlock()
		return false
	}
	cancel := globalInstallJob.cancel
	globalInstallJob.progress = InstallProgress{Phase: "cancelled", Percent: 0, Message: "安装已取消"}
	globalInstallJob.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	b := newRodBrowser(env, context.Background())
	_ = os.RemoveAll(b.Dir())
	return true
}

// StartInstallChromiumAsync begins a background Chromium download (single flight).
func StartInstallChromiumAsync(env func(string) string) (started bool, err error) {
	globalInstallJob.mu.Lock()
	if globalInstallJob.running {
		globalInstallJob.mu.Unlock()
		return false, nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	globalInstallJob.running = true
	globalInstallJob.done = false
	globalInstallJob.err = ""
	globalInstallJob.cancel = cancel
	globalInstallJob.progress = InstallProgress{Phase: "queued", Percent: 0, Message: "等待开始…"}
	globalInstallJob.mu.Unlock()

	go func() {
		installErr := InstallChromium(ctx, env, func(p InstallProgress) {
			globalInstallJob.mu.Lock()
			globalInstallJob.progress = p
			globalInstallJob.mu.Unlock()
		})
		globalInstallJob.mu.Lock()
		globalInstallJob.running = false
		globalInstallJob.done = true
		globalInstallJob.cancel = nil
		if installErr != nil {
			if errors.Is(installErr, context.Canceled) {
				globalInstallJob.err = ""
				if globalInstallJob.progress.Phase != "cancelled" {
					globalInstallJob.progress = InstallProgress{Phase: "cancelled", Percent: 0, Message: "安装已取消"}
				}
			} else {
				globalInstallJob.err = installErr.Error()
				globalInstallJob.progress = InstallProgress{Phase: "error", Percent: globalInstallJob.progress.Percent, Message: installErr.Error()}
			}
		}
		globalInstallJob.mu.Unlock()
	}()
	return true, nil
}
