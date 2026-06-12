package runtime

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	toolbuiltin "github.com/stellarlinkco/agentsdk-go/pkg/tool/builtin"
)

func TestCompatWriteTool_DefaultHTMLPath(t *testing.T) {
	dir := t.TempDir()
	wt := compatTool{Tool: toolbuiltin.NewWriteToolWithSandbox(dir, nil)}

	_, err := wt.Execute(context.Background(), map[string]interface{}{
		"html": "<html><body>report</body></html>",
	})
	if err != nil {
		t.Fatalf("execute: %v", err)
	}

	got := filepath.Join(dir, defaultWriteHTMLPath)
	if _, err := os.Stat(got); err != nil {
		t.Fatalf("expected %s: %v", got, err)
	}
}

func TestCompatWriteTool_IncompleteHTMLWarning(t *testing.T) {
	dir := t.TempDir()
	wt := compatTool{Tool: toolbuiltin.NewWriteToolWithSandbox(dir, nil)}

	res, err := wt.Execute(context.Background(), map[string]interface{}{
		"html": "<html><head><title>x</title><body><p>partial",
	})
	if err != nil {
		t.Fatalf("execute: %v", err)
	}
	if res == nil || !res.Success {
		t.Fatalf("expected success")
	}
	if !strings.Contains(res.Output, "HTML may be incomplete") {
		t.Fatalf("expected completeness warning, got: %q", res.Output)
	}
}

func TestCompatToolSchemaHasNoParamAliases(t *testing.T) {
	read := compatTool{Tool: toolbuiltin.NewReadToolWithRoot(".")}
	schema := read.Schema()
	if schema == nil {
		t.Fatal("schema is nil")
	}
	for _, alias := range []string{"path", "filepath", "filePath", "filename", "file"} {
		if _, ok := schema.Properties[alias]; ok {
			t.Fatalf("read schema should not expose alias %q", alias)
		}
	}
	if _, ok := schema.Properties["file_path"]; !ok {
		t.Fatal("read schema missing file_path")
	}

	write := compatTool{Tool: toolbuiltin.NewWriteToolWithRoot(".")}
	wschema := write.Schema()
	for _, alias := range []string{"text", "body", "data", "html"} {
		if _, ok := wschema.Properties[alias]; ok {
			t.Fatalf("write schema should not expose alias %q", alias)
		}
	}
}

func TestCompatWriteTool_PathAlias(t *testing.T) {
	dir := t.TempDir()
	wt := compatTool{Tool: toolbuiltin.NewWriteToolWithSandbox(dir, nil)}

	_, err := wt.Execute(context.Background(), map[string]interface{}{
		"filename": "notes.txt",
		"text":     "hello",
	})
	if err != nil {
		t.Fatalf("execute: %v", err)
	}

	got := filepath.Join(dir, "notes.txt")
	if _, err := os.Stat(got); err != nil {
		t.Fatalf("expected %s: %v", got, err)
	}
}
