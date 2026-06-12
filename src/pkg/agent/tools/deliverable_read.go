package tools

import (
	"context"
	"path/filepath"
	"strings"

	"github.com/stellarlinkco/agentsdk-go/pkg/tool"
)

type deliverableReadTool struct {
	inner       tool.Tool
	projectRoot string
}

func WrapReadToolWithDeliverables(inner tool.Tool, projectRoot string) tool.Tool {
	if inner == nil {
		return nil
	}
	root := strings.TrimSpace(projectRoot)
	if root == "" {
		root = "."
	}
	return deliverableReadTool{inner: inner, projectRoot: root}
}

func (d deliverableReadTool) Name() string        { return d.inner.Name() }
func (d deliverableReadTool) Description() string { return d.inner.Description() }
func (d deliverableReadTool) Schema() *tool.JSONSchema {
	return d.inner.Schema()
}

func (d deliverableReadTool) Execute(ctx context.Context, params map[string]interface{}) (*tool.ToolResult, error) {
	result, err := d.inner.Execute(ctx, params)
	if err != nil || result == nil || !result.Success {
		return result, err
	}
	rawPath := firstNonEmptyPathParam(params)
	if rawPath == "" {
		return result, err
	}
	ext := strings.ToLower(filepath.Ext(rawPath))
	if ext == ".html" || ext == ".htm" {
		blocks := attachmentBlocksFromLocalHTMLFile(d.projectRoot, rawPath)
		if len(blocks) == 0 {
			return result, err
		}
		src := blocks[0]
		filename, _ := src["filename"].(string)
		mimeType, _ := src["mimeType"].(string)
		data := ""
		if source, ok := src["source"].(map[string]interface{}); ok {
			data, _ = source["data"].(string)
		}
		if data == "" {
			return result, err
		}
		summary := strings.TrimSpace(result.Output)
		if summary == "" {
			summary = "Read local HTML file."
		}
		result.Output = formatAttachmentOutput(summary, []openOctaAttachment{{
			Type:     "file",
			Filename: filename,
			MimeType: mimeType,
			Data:     data,
		}})
		return result, err
	}
	if blocks := attachmentBlocksFromLocalImageFile(d.projectRoot, rawPath); len(blocks) > 0 {
		src := blocks[0]
		filename, _ := src["filename"].(string)
		mimeType, _ := src["mimeType"].(string)
		data := ""
		if source, ok := src["source"].(map[string]interface{}); ok {
			data, _ = source["data"].(string)
		}
		if data != "" {
			summary := strings.TrimSpace(result.Output)
			if summary == "" {
				summary = "Read local image file."
			}
			result.Output = formatAttachmentOutput(summary, []openOctaAttachment{{
				Type:     "image",
				Filename: filename,
				MimeType: mimeType,
				Data:     data,
			}})
		}
	}
	return result, err
}

func firstNonEmptyPathParam(params map[string]interface{}) string {
	if params == nil {
		return ""
	}
	for _, key := range []string{"file_path", "path", "filepath", "filePath", "filename"} {
		if v, ok := params[key]; ok {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				return strings.TrimSpace(s)
			}
		}
	}
	return ""
}
