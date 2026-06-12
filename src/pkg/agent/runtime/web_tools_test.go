package runtime

import (
	"testing"

	agenttools "github.com/openocta/openocta/pkg/agent/tools"
)

func TestShouldRegisterWebTools(t *testing.T) {
	if !shouldRegisterWebTools(Options{}) {
		t.Fatal("nil EnableWebTools should default to true")
	}
	on := true
	if !shouldRegisterWebTools(Options{EnableWebTools: &on}) {
		t.Fatal("EnableWebTools=true should register web tools")
	}
	off := false
	if shouldRegisterWebTools(Options{EnableWebTools: &off}) {
		t.Fatal("EnableWebTools=false should skip web tools")
	}
}

func TestFilterOutWebToolsFromExtraTools(t *testing.T) {
	off := false
	opts := Options{
		EnableWebTools: &off,
		Tools:          agenttools.WebToolsFromConfig(nil, "."),
	}
	if shouldRegisterWebTools(opts) {
		t.Fatal("web tools disabled for run")
	}
	// Simulate runtime.New extra-tools path without full bootstrap.
	filtered := agenttools.FilterOutWebTools(opts.Tools)
	if len(filtered) != 0 {
		t.Fatalf("expected all web tools filtered, got %d", len(filtered))
	}
}
