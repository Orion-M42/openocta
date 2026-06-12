package tools

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLooksLikeLocalResource(t *testing.T) {
	cases := map[string]bool{
		"attachments/report.html": true,
		"file:///tmp/report.html": true,
		"./out/report.html":       true,
		"https://example.com/a":   false,
	}
	for input, want := range cases {
		if got := looksLikeLocalResource(input); got != want {
			t.Fatalf("%q: got %v want %v", input, got, want)
		}
	}
}

func TestAttachmentBlocksFromReferencedPaths(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "attachments", "report.html")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("<html><body>ok</body></html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	text := "报告已保存到 `attachments/report.html`，请点击 [预览](attachments/report.html)"
	blocks := AttachmentBlocksFromReferencedPaths(text, dir)
	if len(blocks) != 1 {
		t.Fatalf("expected 1 block, got %d", len(blocks))
	}
}

func TestAttachmentBlocksFromImagePathsInGlobOutput(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "photos", "cat.jpg")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte{0xff, 0xd8, 0xff, 0xe0}, 0o644); err != nil {
		t.Fatal(err)
	}
	output := "photos/cat.jpg\nphotos/dog.png\n"
	blocks := AttachmentBlocksFromDeliverableToolOutput("glob", output, dir)
	if len(blocks) != 1 {
		t.Fatalf("expected 1 image block, got %d", len(blocks))
	}
	if blocks[0]["type"] != "image" {
		t.Fatalf("expected image block, got %#v", blocks[0]["type"])
	}
}

func TestWebFetchLocalHTMLAttachesFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "attachments", "report.html")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	html := "<html><body>ok</body></html>"
	if err := os.WriteFile(path, []byte(html), 0o644); err != nil {
		t.Fatal(err)
	}

	tool := &WebFetchTool{ProjectRoot: dir}
	result, err := tool.Execute(t.Context(), map[string]interface{}{"url": "attachments/report.html"})
	if err != nil {
		t.Fatal(err)
	}
	if !result.Success {
		t.Fatalf("expected success, got %s", result.Output)
	}
	blocks := ParseOpenOctaAttachments(result.Output)
	if len(blocks) != 1 {
		t.Fatalf("expected 1 attachment block, got %d", len(blocks))
	}
	if blocks[0]["type"] != "file" {
		t.Fatalf("expected file block, got %#v", blocks[0]["type"])
	}
}
