package tools_test

import (
	"testing"

	"github.com/openocta/openocta/pkg/agent/tools"
	"github.com/openocta/openocta/pkg/config"
)

func TestBrowserToolsFromConfigDefaultEnabled(t *testing.T) {
	got := tools.BrowserToolsFromConfig(nil)
	if len(got) != 1 {
		t.Fatalf("expected 1 browser tool, got %d", len(got))
	}
	if got[0].Name() != "browser" {
		t.Fatalf("unexpected tool name: %s", got[0].Name())
	}
}

func TestBrowserToolsFromConfigDisabled(t *testing.T) {
	enabled := false
	cfg := &config.OpenOctaConfig{
		Browser: &config.BrowserConfig{Enabled: &enabled},
	}
	if len(tools.BrowserToolsFromConfig(cfg)) != 0 {
		t.Fatal("expected no tools when browser.enabled=false")
	}
}
