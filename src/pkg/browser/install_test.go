package browser

import (
	"testing"
)

func TestResolveRodBrowserRootDir(t *testing.T) {
	dir := ResolveRodBrowserRootDir(func(string) string { return "" })
	if dir == "" {
		t.Fatal("expected rod root dir")
	}
}

func TestResolveChromiumInstallDir(t *testing.T) {
	dir := ResolveChromiumInstallDir(func(string) string { return "" })
	if dir == "" {
		t.Fatal("expected install dir")
	}
}

func TestCancelInstallChromiumWhenIdle(t *testing.T) {
	if CancelInstallChromium(func(string) string { return "" }) {
		t.Fatal("expected cancel to be false when no install running")
	}
}
