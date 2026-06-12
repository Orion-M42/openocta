package handlers

import "testing"

func TestValidateChatAttachmentMeta(t *testing.T) {
	t.Parallel()

	if err := validateChatAttachmentMeta("notes.txt", "text/plain", 128); err != nil {
		t.Fatalf("expected txt to pass, got %v", err)
	}
	if err := validateChatAttachmentMeta("photo.png", "image/png", chatAttachmentMaxBytes); err != nil {
		t.Fatalf("expected png at limit to pass, got %v", err)
	}
	if err := validateChatAttachmentMeta("archive.zip", "application/zip", 64); err == nil {
		t.Fatal("expected zip to be rejected")
	}
	if err := validateChatAttachmentMeta("big.pdf", "application/pdf", chatAttachmentMaxBytes+1); err == nil {
		t.Fatal("expected oversize attachment to be rejected")
	}
}
