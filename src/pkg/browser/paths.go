package browser

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/openocta/openocta/pkg/config"
	"github.com/openocta/openocta/pkg/paths"
)

const bundledChromiumDirName = "chromium"

// ResolveChromiumExecutable returns the path to the bundled Chromium/Chrome binary.
// Resolution order:
//  1. browser.executablePath in config
//  2. OPENOCTA_BUNDLED_CHROMIUM_DIR env (file or directory)
//  3. Directory next to executable: chromium/
//  4. macOS .app bundle: ../Resources/chromium/
//  5. Dev cwd: ./chromium/ or ./resources/chromium/
func ResolveChromiumExecutable(cfg *config.OpenOctaConfig, env func(string) string) (string, error) {
	if env == nil {
		env = os.Getenv
	}
	if cfg != nil && cfg.Browser != nil {
		if p := strings.TrimSpace(ptrStr(cfg.Browser.ExecutablePath)); p != "" {
			abs, err := absPath(p, env)
			if err != nil {
				return "", fmt.Errorf("configured browser.executablePath: %w", err)
			}
			if err := validateChromiumExecutable(abs); err != nil {
				return "", err
			}
			return abs, nil
		}
	}
	if override := strings.TrimSpace(env("OPENOCTA_BUNDLED_CHROMIUM_DIR")); override != "" {
		if p, err := resolveFromDirOrFile(override, env); err == nil {
			if err := validateChromiumExecutable(p); err != nil {
				return "", err
			}
			return p, nil
		}
	}
	candidates := bundledDirCandidates(env)
	for _, dir := range candidates {
		if p, err := chromiumBinaryInDir(dir); err == nil {
			if err := validateChromiumExecutable(p); err != nil {
				continue
			}
			return p, nil
		}
	}
	return "", fmt.Errorf("bundled Chromium not found; run Setup Wizard → 环境初始化 to download Chromium (Rod), or place binaries under one of: %v (or set OPENOCTA_BUNDLED_CHROMIUM_DIR / browser.executablePath)", candidates)
}

func bundledDirCandidates(env func(string) string) []string {
	var out []string
	// Rod wizard download first, then legacy CfT layout — never prefer dev cwd symlinks.
	out = append(out, ResolveRodBrowserRootDir(env))
	out = append(out, ResolveChromiumInstallDir(env))
	if execPath, err := os.Executable(); err == nil {
		execDir := filepath.Dir(execPath)
		out = append(out,
			filepath.Join(execDir, bundledChromiumDirName),
			filepath.Join(execDir, "resources", bundledChromiumDirName),
		)
		if runtime.GOOS == "darwin" && strings.Contains(execDir, ".app/Contents/MacOS") {
			resources := filepath.Clean(filepath.Join(execDir, "..", "Resources", bundledChromiumDirName))
			out = append(out, resources)
		}
	}
	if cwd, err := os.Getwd(); err == nil {
		out = append(out,
			filepath.Join(cwd, bundledChromiumDirName),
			filepath.Join(cwd, "resources", bundledChromiumDirName),
			filepath.Join(cwd, "..", bundledChromiumDirName),
		)
	}
	return out
}

func resolveFromDirOrFile(p string, env func(string) string) (string, error) {
	abs, err := absPath(p, env)
	if err != nil {
		return "", err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return "", err
	}
	if !info.IsDir() {
		return abs, nil
	}
	return chromiumBinaryInDir(abs)
}

func chromiumBinaryInDir(dir string) (string, error) {
	dir = strings.TrimSpace(dir)
	if dir == "" {
		return "", fmt.Errorf("empty chromium dir")
	}
	if p, err := chromiumBinaryAtRoot(dir); err == nil {
		return p, nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", fmt.Errorf("no chromium binary under %s", dir)
	}
	best := ""
	bestRev := -1
	for _, e := range entries {
		if !e.IsDir() || !strings.HasPrefix(e.Name(), "chromium-") {
			continue
		}
		rev, _ := strconv.Atoi(strings.TrimPrefix(e.Name(), "chromium-"))
		sub := filepath.Join(dir, e.Name())
		p, err := chromiumBinaryAtRoot(sub)
		if err != nil {
			continue
		}
		if rev >= bestRev {
			bestRev = rev
			best = p
		}
	}
	if best != "" {
		return best, nil
	}
	return "", fmt.Errorf("no chromium binary under %s", dir)
}

func chromiumBinaryAtRoot(dir string) (string, error) {
	switch runtime.GOOS {
	case "windows":
		for _, name := range []string{"chrome.exe", "chromium.exe", filepath.Join("chrome-win", "chrome.exe")} {
			p := filepath.Join(dir, name)
			if fileExists(p) {
				return p, nil
			}
		}
	case "darwin":
		for _, rel := range []string{
			"Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
			"Chromium.app/Contents/MacOS/Chromium",
			"chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
			"chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
			"chrome-mac/Chromium.app/Contents/MacOS/Chromium",
			"chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium",
			"chrome",
		} {
			p := filepath.Join(dir, rel)
			if fileExists(p) {
				return p, nil
			}
		}
	default:
		for _, name := range []string{"chrome", "chromium", filepath.Join("chrome-linux", "chrome")} {
			p := filepath.Join(dir, name)
			if fileExists(p) {
				return p, nil
			}
		}
	}
	return "", fmt.Errorf("no chromium binary under %s", dir)
}

// ResolveUserDataDir returns the persistent browser profile directory.
func ResolveUserDataDir(env func(string) string) string {
	if env == nil {
		env = os.Getenv
	}
	if override := strings.TrimSpace(env("OPENOCTA_BROWSER_PROFILE_DIR")); override != "" {
		return expandUserPath(override, env)
	}
	return filepath.Join(paths.ResolveStateDir(env), "browser", "profile")
}

func headlessFromConfig(cfg *config.OpenOctaConfig, env func(string) string) bool {
	if cfg != nil && cfg.Browser != nil && cfg.Browser.Headless != nil {
		return *cfg.Browser.Headless
	}
	if env == nil {
		env = os.Getenv
	}
	runMode := paths.ResolveRunMode(env, gatewayMode(cfg))
	// Local desktop: headed window; remote service: headless + UI preview via API.
	return runMode != "desktop"
}

func ptrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func fileExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && !info.IsDir()
}

func absPath(p string, env func(string) string) (string, error) {
	p = strings.TrimSpace(p)
	if p == "" {
		return "", fmt.Errorf("empty path")
	}
	if strings.HasPrefix(p, "~") {
		p = expandUserPath(p, env)
	}
	if filepath.IsAbs(p) {
		return filepath.Clean(p), nil
	}
	if cwd, err := os.Getwd(); err == nil {
		return filepath.Clean(filepath.Join(cwd, p)), nil
	}
	return filepath.Clean(p), nil
}

// validateChromiumExecutable rejects system browsers and broken paths.
// OpenOcta must only drive Chrome for Testing / bundled Chromium, not the user's daily browser.
func validateChromiumExecutable(path string) error {
	path = strings.TrimSpace(path)
	if path == "" {
		return fmt.Errorf("empty chromium executable path")
	}
	resolved, err := filepath.EvalSymlinks(path)
	if err != nil {
		resolved = filepath.Clean(path)
	} else {
		resolved = filepath.Clean(resolved)
	}
	if !fileExists(resolved) {
		return fmt.Errorf("chromium executable not found: %s", path)
	}
	for _, blocked := range disallowedSystemBrowserPaths() {
		if strings.HasPrefix(resolved, blocked) {
			return fmt.Errorf(
				"refusing to use system browser %s; install Chromium via Setup Wizard (环境初始化) or place it under %s",
				resolved,
				ResolveRodBrowserRootDir(os.Getenv),
			)
		}
	}
	return nil
}

func disallowedSystemBrowserPaths() []string {
	switch runtime.GOOS {
	case "darwin":
		return []string{
			"/Applications/Google Chrome.app",
			"/Applications/Google Chrome Canary.app",
			"/Applications/Chromium.app",
			"/Applications/Microsoft Edge.app",
			"/Applications/Brave Browser.app",
			"/Applications/Arc.app",
		}
	case "windows":
		programFiles := os.Getenv("ProgramFiles")
		programFilesX86 := os.Getenv("ProgramFiles(x86)")
		localAppData := os.Getenv("LOCALAPPDATA")
		var out []string
		for _, root := range []string{programFiles, programFilesX86, localAppData} {
			root = strings.TrimSpace(root)
			if root == "" {
				continue
			}
			out = append(out,
				filepath.Join(root, "Google", "Chrome"),
				filepath.Join(root, "Microsoft", "Edge"),
			)
		}
		return out
	default:
		return []string{
			"/usr/bin/google-chrome",
			"/usr/bin/google-chrome-stable",
			"/usr/bin/chromium-browser",
			"/usr/bin/chromium",
			"/snap/bin/chromium",
		}
	}
}

func expandUserPath(p string, env func(string) string) string {
	if !strings.HasPrefix(p, "~") {
		return p
	}
	home := strings.TrimSpace(env("HOME"))
	if home == "" && runtime.GOOS == "windows" {
		home = strings.TrimSpace(env("USERPROFILE"))
	}
	if home == "" {
		return p
	}
	return filepath.Join(home, strings.TrimPrefix(p, "~"))
}
