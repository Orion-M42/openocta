package handlers

import "testing"

func TestShouldSkipAssistantTextBlock(t *testing.T) {
	t.Parallel()

	toolBlocks := []map[string]interface{}{
		{"type": "toolCall", "id": "bash:1", "name": "bash"},
	}

	if !shouldSkipAssistantTextBlock(".", toolBlocks) {
		t.Fatal("expected placeholder text with tool calls to be skipped")
	}
	if shouldSkipAssistantTextBlock("checking chrome", toolBlocks) {
		t.Fatal("expected real text with tool calls to be kept")
	}
	if !shouldSkipAssistantTextBlock(" . ", toolBlocks) {
		t.Fatal("expected trimmed placeholder text to be skipped")
	}
	if shouldSkipAssistantTextBlock(".", nil) {
		t.Fatal("expected placeholder without tool calls to be kept")
	}
}

func TestShouldSuppressAssistantTextForA2UI(t *testing.T) {
	t.Parallel()

	a2uiBlocks := []map[string]interface{}{
		{"type": "a2ui", "a2ui": map[string]interface{}{"createSurface": map[string]interface{}{}}},
	}
	if !shouldSuppressAssistantTextForA2UI("hello", a2uiBlocks, false) {
		t.Fatal("expected text suppressed when content already has a2ui")
	}
	if !shouldSuppressAssistantTextForA2UI("hello", nil, true) {
		t.Fatal("expected text suppressed when turn has a2ui")
	}
	if shouldSuppressAssistantTextForA2UI("hello", nil, false) {
		t.Fatal("expected plain text kept when no a2ui")
	}
}

func TestNormalizeAssistantContentForA2UI(t *testing.T) {
	t.Parallel()

	withBoth := []map[string]interface{}{
		{"type": "text", "text": "hello"},
		{"type": "a2ui", "a2ui": map[string]interface{}{"createSurface": map[string]interface{}{"surfaceId": "main"}}},
	}
	out := normalizeAssistantContentForA2UI(withBoth, true, nil)
	if combinedAssistantText(out) != "" {
		t.Fatalf("expected text stripped when a2ui present, got %q", combinedAssistantText(out))
	}
	if !assistantContentHasA2UI(out) {
		t.Fatal("expected a2ui block preserved")
	}

	textOnly := []map[string]interface{}{
		{"type": "text", "text": "你好"},
	}
	out = normalizeAssistantContentForA2UI(textOnly, true, nil)
	if combinedAssistantText(out) != "" {
		t.Fatalf("expected text converted away on final turn, got %q", combinedAssistantText(out))
	}
	if !assistantContentHasA2UI(out) {
		t.Fatal("expected a2ui block from plain text conversion")
	}

	intermediate := normalizeAssistantContentForA2UI(textOnly, false, nil)
	if combinedAssistantText(intermediate) != "你好" {
		t.Fatalf("expected text kept on non-final turn, got %q", combinedAssistantText(intermediate))
	}
}

func TestExtractAssistantTextForIMDeliverySkipsPlaceholder(t *testing.T) {
	t.Parallel()

	msg := map[string]interface{}{
		"role": "assistant",
		"content": []map[string]interface{}{
			{"type": "text", "text": "."},
			{"type": "toolCall", "id": "bash:1", "name": "bash"},
		},
	}
	if got := extractAssistantTextForIMDelivery(msg); got != "" {
		t.Fatalf("extractAssistantTextForIMDelivery() = %q, want empty", got)
	}
}
