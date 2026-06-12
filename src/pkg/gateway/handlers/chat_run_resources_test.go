package handlers

import "testing"

func TestChatRunDisallowedToolsWebSearchOffByDefault(t *testing.T) {
	disallowed := chatRunDisallowedTools(ChatRunResources{})
	if len(disallowed) != 3 {
		t.Fatalf("expected 3 disallowed tools, got %v", disallowed)
	}
}

func TestChatRunDisallowedToolsWebSearchEnabled(t *testing.T) {
	disallowed := chatRunDisallowedTools(ChatRunResources{WebSearch: true})
	if len(disallowed) != 0 {
		t.Fatalf("expected no disallowed tools, got %v", disallowed)
	}
}
