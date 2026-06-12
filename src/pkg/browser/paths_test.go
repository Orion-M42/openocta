package browser

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestChromiumBinaryInDirWindows(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("windows-only")
	}
	dir := t.TempDir()
	want := filepath.Join(dir, "chrome.exe")
	if err := touchFile(want); err != nil {
		t.Fatal(err)
	}
	got, err := chromiumBinaryInDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestChromiumBinaryInDirDarwin(t *testing.T) {
	if runtime.GOOS != "darwin" {
		t.Skip("darwin-only")
	}
	dir := t.TempDir()
	want := filepath.Join(dir, "Chromium.app", "Contents", "MacOS", "Chromium")
	if err := touchFile(want); err != nil {
		t.Fatal(err)
	}
	got, err := chromiumBinaryInDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestResolveChromiumExecutableMissing(t *testing.T) {
	t.Setenv("OPENOCTA_BUNDLED_CHROMIUM_DIR", t.TempDir())
	_, err := ResolveChromiumExecutable(nil, os.Getenv)
	if err == nil {
		t.Fatal("expected error when chromium dir is empty")
	}
}

func TestValidateChromiumExecutableRejectsSystemChrome(t *testing.T) {
	if runtime.GOOS != "darwin" {
		t.Skip("darwin-only")
	}
	systemChrome := "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
	if _, err := os.Stat(systemChrome); err != nil {
		t.Skip("system Google Chrome not installed")
	}
	err := validateChromiumExecutable(systemChrome)
	if err == nil {
		t.Fatal("expected system chrome to be rejected")
	}
}

func TestBundledDirCandidatesPrefersInstallDir(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("OPENOCTA_STATE_DIR", "")
	env := os.Getenv
	candidates := bundledDirCandidates(env)
	if len(candidates) == 0 {
		t.Fatal("expected candidates")
	}
	want := ResolveRodBrowserRootDir(env)
	if candidates[0] != want {
		t.Fatalf("rod install dir should be first candidate, got %q want %q", candidates[0], want)
	}
}

func touchFile(p string) error {
	if err := os.MkdirAll(filepath.Dir(p), 0755); err != nil {
		return err
	}
	f, err := os.Create(p)
	if err != nil {
		return err
	}
	return f.Close()
}
