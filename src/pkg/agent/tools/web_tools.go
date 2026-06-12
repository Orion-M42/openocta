package tools

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/openocta/openocta/pkg/config"
	"github.com/stellarlinkco/agentsdk-go/pkg/tool"
)

const (
	openOctaAttachmentsMarker = "@@OPENOCTA_ATTACHMENTS@@"
	defaultWebUserAgent       = "Mozilla/5.0 (compatible; OpenOcta/1.0; +https://openocta.local)"
	defaultSearchMaxResults   = 5
	defaultFetchMaxChars      = 12000
	defaultHTTPTimeout        = 25 * time.Second
)

// WebToolNames lists chat web tools gated by the per-run webSearch toggle.
var WebToolNames = []string{"web_search", "web_fetch", "download_image"}

// IsWebToolName reports whether name is a web tool that requires network access.
func IsWebToolName(name string) bool {
	key := strings.ToLower(strings.TrimSpace(name))
	for _, n := range WebToolNames {
		if key == n {
			return true
		}
	}
	return false
}

// FilterOutWebTools removes web_search, web_fetch, and download_image from a tool list.
func FilterOutWebTools(tools []tool.Tool) []tool.Tool {
	if len(tools) == 0 {
		return tools
	}
	out := make([]tool.Tool, 0, len(tools))
	for _, t := range tools {
		if t == nil || IsWebToolName(t.Name()) {
			continue
		}
		out = append(out, t)
	}
	return out
}

// WebToolsFromConfig registers web_search, web_fetch, and download_image for chat runs.
// When cfg is nil or tools are not explicitly disabled, Bing search and HTTP fetch are enabled by default.
func WebToolsFromConfig(cfg *config.OpenOctaConfig, projectRoot string) []tool.Tool {
	searchEnabled := webSearchEnabled(cfg)
	fetchEnabled := webFetchEnabled(cfg)
	if !searchEnabled && !fetchEnabled {
		return nil
	}
	root := strings.TrimSpace(projectRoot)
	if root == "" {
		root = "."
	}
	attachmentsDir := filepath.Join(root, "attachments")
	var out []tool.Tool
	if searchEnabled {
		out = append(out, &WebSearchTool{Config: cfg})
	}
	if fetchEnabled {
		out = append(out, &WebFetchTool{Config: cfg, ProjectRoot: root})
		out = append(out, &DownloadImageTool{AttachmentsDir: attachmentsDir})
	}
	return out
}

func webSearchEnabled(cfg *config.OpenOctaConfig) bool {
	if cfg == nil || cfg.Tools == nil || cfg.Tools.Web == nil || cfg.Tools.Web.Search == nil {
		return true
	}
	if cfg.Tools.Web.Search.Enabled != nil {
		return *cfg.Tools.Web.Search.Enabled
	}
	return true
}

func webFetchEnabled(cfg *config.OpenOctaConfig) bool {
	if cfg == nil || cfg.Tools == nil || cfg.Tools.Web == nil || cfg.Tools.Web.Fetch == nil {
		return true
	}
	if cfg.Tools.Web.Fetch.Enabled != nil {
		return *cfg.Tools.Web.Fetch.Enabled
	}
	return true
}

func webSearchProvider(cfg *config.OpenOctaConfig) string {
	if cfg != nil && cfg.Tools != nil && cfg.Tools.Web != nil && cfg.Tools.Web.Search != nil {
		if p := strings.TrimSpace(ptrStr(cfg.Tools.Web.Search.Provider)); p != "" {
			return strings.ToLower(p)
		}
	}
	return "bing"
}

func webSearchMaxResults(cfg *config.OpenOctaConfig) int {
	if cfg != nil && cfg.Tools != nil && cfg.Tools.Web != nil && cfg.Tools.Web.Search != nil {
		if cfg.Tools.Web.Search.MaxResults != nil && *cfg.Tools.Web.Search.MaxResults > 0 {
			return *cfg.Tools.Web.Search.MaxResults
		}
	}
	return defaultSearchMaxResults
}

func webFetchMaxChars(cfg *config.OpenOctaConfig) int {
	if cfg != nil && cfg.Tools != nil && cfg.Tools.Web != nil && cfg.Tools.Web.Fetch != nil {
		if cfg.Tools.Web.Fetch.MaxChars != nil && *cfg.Tools.Web.Fetch.MaxChars > 0 {
			return *cfg.Tools.Web.Fetch.MaxChars
		}
	}
	return defaultFetchMaxChars
}

func webHTTPTimeout(cfg *config.OpenOctaConfig, search bool) time.Duration {
	if cfg != nil && cfg.Tools != nil && cfg.Tools.Web != nil {
		if search && cfg.Tools.Web.Search != nil && cfg.Tools.Web.Search.TimeoutSeconds != nil && *cfg.Tools.Web.Search.TimeoutSeconds > 0 {
			return time.Duration(*cfg.Tools.Web.Search.TimeoutSeconds) * time.Second
		}
		if !search && cfg.Tools.Web.Fetch != nil && cfg.Tools.Web.Fetch.TimeoutSeconds != nil && *cfg.Tools.Web.Fetch.TimeoutSeconds > 0 {
			return time.Duration(*cfg.Tools.Web.Fetch.TimeoutSeconds) * time.Second
		}
	}
	return defaultHTTPTimeout
}

func webUserAgent(cfg *config.OpenOctaConfig) string {
	if cfg != nil && cfg.Tools != nil && cfg.Tools.Web != nil && cfg.Tools.Web.Fetch != nil {
		if ua := strings.TrimSpace(ptrStr(cfg.Tools.Web.Fetch.UserAgent)); ua != "" {
			return ua
		}
	}
	return defaultWebUserAgent
}

func ptrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

type openOctaAttachment struct {
	Type     string `json:"type"`
	Filename string `json:"filename,omitempty"`
	MimeType string `json:"mimeType,omitempty"`
	Data     string `json:"data,omitempty"`
	URL      string `json:"url,omitempty"`
}

func formatAttachmentOutput(summary string, attachments []openOctaAttachment) string {
	if len(attachments) == 0 {
		return summary
	}
	raw, err := json.Marshal(attachments)
	if err != nil {
		return summary
	}
	return summary + "\n" + openOctaAttachmentsMarker + "\n" + string(raw)
}

// WebSearchTool searches the public web (Bing by default, Brave when API key is configured).
type WebSearchTool struct {
	Config *config.OpenOctaConfig
}

func (WebSearchTool) Name() string { return "web_search" }

func (WebSearchTool) Description() string {
	return "Search the web for up-to-date information. Returns titles, URLs, and snippets. Use download_image after finding an image URL."
}

func (WebSearchTool) Schema() *tool.JSONSchema {
	return &tool.JSONSchema{
		Type: "object",
		Properties: map[string]interface{}{
			"query": map[string]interface{}{
				"type":        "string",
				"description": "Search query",
			},
			"max_results": map[string]interface{}{
				"type":        "integer",
				"description": "Maximum results (1-10)",
			},
		},
		Required: []string{"query"},
	}
}

func (t *WebSearchTool) Execute(ctx context.Context, params map[string]interface{}) (*tool.ToolResult, error) {
	query, _ := params["query"].(string)
	query = strings.TrimSpace(query)
	if query == "" {
		return &tool.ToolResult{Success: false, Output: "query is required"}, nil
	}
	maxResults := webSearchMaxResults(t.Config)
	if v, ok := params["max_results"].(float64); ok && int(v) > 0 {
		maxResults = int(v)
	}
	if maxResults > 10 {
		maxResults = 10
	}
	provider := webSearchProvider(t.Config)
	var (
		results []searchResult
		err     error
	)
	switch provider {
	case "brave":
		results, err = braveWebSearch(ctx, t.Config, query, maxResults)
	default:
		results, err = bingWebSearch(ctx, t.Config, query, maxResults)
	}
	if err != nil {
		return &tool.ToolResult{Success: false, Output: fmt.Sprintf("web search failed: %v", err)}, nil
	}
	if len(results) == 0 {
		return &tool.ToolResult{Success: true, Output: fmt.Sprintf("No results for: %s", query)}, nil
	}
	var b strings.Builder
	for i, r := range results {
		b.WriteString(fmt.Sprintf("%d. %s\n   %s\n   %s\n", i+1, r.Title, r.URL, r.Snippet))
	}
	return &tool.ToolResult{Success: true, Output: strings.TrimSpace(b.String())}, nil
}

type searchResult struct {
	Title   string
	URL     string
	Snippet string
}

func bingWebSearch(ctx context.Context, cfg *config.OpenOctaConfig, query string, max int) ([]searchResult, error) {
	q := url.QueryEscape(query)
	reqURL := fmt.Sprintf("https://www.bing.com/search?q=%s&count=%d", q, max)
	body, err := httpGet(ctx, cfg, true, reqURL)
	if err != nil {
		return nil, err
	}
	html := string(body)
	titleRe := regexp.MustCompile(`(?is)<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>.*?<h2>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>`)
	snippetRe := regexp.MustCompile(`(?is)<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>.*?<p[^>]*>(.*?)</p>`)
	titles := titleRe.FindAllStringSubmatch(html, max)
	snippets := snippetRe.FindAllStringSubmatch(html, max)
	out := make([]searchResult, 0, len(titles))
	for i, m := range titles {
		if len(m) < 3 {
			continue
		}
		link := htmlUnescape(stripTags(m[1]))
		title := htmlUnescape(stripTags(m[2]))
		snippet := ""
		if i < len(snippets) && len(snippets[i]) > 1 {
			snippet = htmlUnescape(stripTags(snippets[i][1]))
		}
		if link == "" || title == "" {
			continue
		}
		out = append(out, searchResult{Title: title, URL: link, Snippet: snippet})
	}
	if len(out) == 0 {
		// Fallback: image search links for common "download image" requests
		imgURL := fmt.Sprintf("https://www.bing.com/images/search?q=%s", q)
		out = append(out, searchResult{
			Title:   "Bing image search",
			URL:     imgURL,
			Snippet: "Open image results and pass a direct image URL to download_image.",
		})
	}
	return out, nil
}

func braveWebSearch(ctx context.Context, cfg *config.OpenOctaConfig, query string, max int) ([]searchResult, error) {
	apiKey := ""
	if cfg != nil && cfg.Tools != nil && cfg.Tools.Web != nil && cfg.Tools.Web.Search != nil {
		apiKey = strings.TrimSpace(ptrStr(cfg.Tools.Web.Search.APIKey))
	}
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("BRAVE_API_KEY"))
	}
	if apiKey == "" {
		return bingWebSearch(ctx, cfg, query, max)
	}
	q := url.QueryEscape(query)
	reqURL := fmt.Sprintf("https://api.search.brave.com/res/v1/web/search?q=%s&count=%d", q, max)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-Subscription-Token", apiKey)
	client := &http.Client{Timeout: webHTTPTimeout(cfg, true)}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("brave API %d: %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}
	var parsed struct {
		Web struct {
			Results []struct {
				Title       string `json:"title"`
				URL         string `json:"url"`
				Description string `json:"description"`
			} `json:"results"`
		} `json:"web"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	out := make([]searchResult, 0, len(parsed.Web.Results))
	for _, r := range parsed.Web.Results {
		if strings.TrimSpace(r.URL) == "" {
			continue
		}
		out = append(out, searchResult{Title: r.Title, URL: r.URL, Snippet: r.Description})
	}
	return out, nil
}

// WebFetchTool fetches a URL and returns text or metadata for images.
type WebFetchTool struct {
	Config      *config.OpenOctaConfig
	ProjectRoot string
}

func (WebFetchTool) Name() string { return "web_fetch" }

func (WebFetchTool) Description() string {
	return "Fetch content from HTTP(S) URLs or local sandbox files (relative paths, absolute paths, file://). For local HTML reports, the file is attached for in-chat preview and download. Use download_image for remote images."
}

func (WebFetchTool) Schema() *tool.JSONSchema {
	return &tool.JSONSchema{
		Type: "object",
		Properties: map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "HTTP/HTTPS URL, or a local sandbox file path (e.g. attachments/report.html, file:///path)",
			},
		},
		Required: []string{"url"},
	}
}

func (t *WebFetchTool) Execute(ctx context.Context, params map[string]interface{}) (*tool.ToolResult, error) {
	rawURL, _ := params["url"].(string)
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return &tool.ToolResult{Success: false, Output: "url is required"}, nil
	}
	if looksLikeLocalResource(rawURL) {
		return t.fetchLocal(ctx, rawURL)
	}
	body, contentType, finalURL, err := httpGetWithMeta(ctx, t.Config, false, rawURL)
	if err != nil {
		return &tool.ToolResult{Success: false, Output: fmt.Sprintf("fetch failed: %v", err)}, nil
	}
	ct := strings.ToLower(contentType)
	if strings.HasPrefix(ct, "image/") {
		return &tool.ToolResult{
			Success: true,
			Output:  fmt.Sprintf("Image URL: %s\nContent-Type: %s\nSize: %d bytes\nUse download_image with this URL to attach the image for the user.", finalURL, contentType, len(body)),
		}, nil
	}
	text := extractReadableText(string(body), webFetchMaxChars(t.Config))
	return &tool.ToolResult{
		Success: true,
		Output:  fmt.Sprintf("URL: %s\nContent-Type: %s\n\n%s", finalURL, contentType, text),
	}, nil
}

func (t *WebFetchTool) fetchLocal(ctx context.Context, rawURL string) (*tool.ToolResult, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	root := strings.TrimSpace(t.ProjectRoot)
	if root == "" {
		root = "."
	}
	body, contentType, displayPath, err := readLocalFile(root, rawURL)
	if err != nil {
		return &tool.ToolResult{Success: false, Output: fmt.Sprintf("fetch failed: %v", err)}, nil
	}
	ct := strings.ToLower(contentType)
	if strings.HasPrefix(ct, "image/") {
		return &tool.ToolResult{
			Success: true,
			Output:  fmt.Sprintf("Local file: %s\nContent-Type: %s\nSize: %d bytes\nUse download_image only for remote HTTP(S) image URLs.", displayPath, contentType, len(body)),
		}, nil
	}
	ext := strings.ToLower(filepath.Ext(displayPath))
	if ext == ".html" || ext == ".htm" || strings.Contains(ct, "html") {
		summary := fmt.Sprintf("Local file: %s\nContent-Type: %s\nSize: %d bytes\nAttached for preview and download in chat.", displayPath, contentType, len(body))
		attachments := []openOctaAttachment{
			fileAttachmentFromBytes(filepath.Base(displayPath), contentType, body),
		}
		return &tool.ToolResult{Success: true, Output: formatAttachmentOutput(summary, attachments)}, nil
	}
	text := string(body)
	if strings.HasPrefix(ct, "text/") || ext == ".json" || ext == ".md" || ext == ".markdown" || ext == ".txt" {
		text = extractReadableText(text, webFetchMaxChars(t.Config))
	}
	return &tool.ToolResult{
		Success: true,
		Output:  fmt.Sprintf("Local file: %s\nContent-Type: %s\n\n%s", displayPath, contentType, text),
	}, nil
}

// DownloadImageTool downloads an image URL and attaches it for chat preview/download.
type DownloadImageTool struct {
	AttachmentsDir string
}

func (DownloadImageTool) Name() string { return "download_image" }

func (DownloadImageTool) Description() string {
	return "Download an image from a public HTTP(S) URL and attach it to the chat so the user can preview and download it."
}

func (DownloadImageTool) Schema() *tool.JSONSchema {
	return &tool.JSONSchema{
		Type: "object",
		Properties: map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "Direct image URL (jpg/png/gif/webp)",
			},
			"filename": map[string]interface{}{
				"type":        "string",
				"description": "Optional filename (e.g. cat.jpg)",
			},
		},
		Required: []string{"url"},
	}
}

func (t *DownloadImageTool) Execute(ctx context.Context, params map[string]interface{}) (*tool.ToolResult, error) {
	rawURL, _ := params["url"].(string)
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return &tool.ToolResult{Success: false, Output: "url is required"}, nil
	}
	body, contentType, finalURL, err := httpGetWithMeta(ctx, nil, false, rawURL)
	if err != nil {
		return &tool.ToolResult{Success: false, Output: fmt.Sprintf("download failed: %v", err)}, nil
	}
	mime := strings.TrimSpace(contentType)
	if mime == "" {
		mime = http.DetectContentType(body)
	}
	if !strings.HasPrefix(strings.ToLower(mime), "image/") {
		return &tool.ToolResult{Success: false, Output: fmt.Sprintf("URL is not an image (content-type: %s). Try a direct image link.", mime)}, nil
	}
	filename, _ := params["filename"].(string)
	filename = strings.TrimSpace(filename)
	if filename == "" {
		filename = filenameFromURL(finalURL, mime)
	}
	dir := strings.TrimSpace(t.AttachmentsDir)
	if dir == "" {
		dir = "attachments"
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return &tool.ToolResult{Success: false, Output: fmt.Sprintf("mkdir attachments: %v", err)}, nil
	}
	safeName := sanitizeFilename(filename)
	path := filepath.Join(dir, safeName)
	if err := os.WriteFile(path, body, 0o644); err != nil {
		return &tool.ToolResult{Success: false, Output: fmt.Sprintf("write file: %v", err)}, nil
	}
	b64 := base64.StdEncoding.EncodeToString(body)
	attachments := []openOctaAttachment{{
		Type:     "image",
		Filename: safeName,
		MimeType: mime,
		Data:     b64,
		URL:      finalURL,
	}}
	summary := fmt.Sprintf("Downloaded image %s (%d bytes) from %s", safeName, len(body), finalURL)
	return &tool.ToolResult{Success: true, Output: formatAttachmentOutput(summary, attachments)}, nil
}

func httpGet(ctx context.Context, cfg *config.OpenOctaConfig, search bool, rawURL string) ([]byte, error) {
	body, _, _, err := httpGetWithMeta(ctx, cfg, search, rawURL)
	return body, err
}

func httpGetWithMeta(ctx context.Context, cfg *config.OpenOctaConfig, search bool, rawURL string) ([]byte, string, string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, "", "", err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, "", "", fmt.Errorf("only http/https URLs are supported")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, "", "", err
	}
	req.Header.Set("User-Agent", webUserAgent(cfg))
	req.Header.Set("Accept", "*/*")
	client := &http.Client{
		Timeout: webHTTPTimeout(cfg, search),
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, "", "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}
	const maxBody = 8 << 20
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBody))
	if err != nil {
		return nil, "", "", err
	}
	ct := resp.Header.Get("Content-Type")
	if idx := strings.Index(ct, ";"); idx >= 0 {
		ct = strings.TrimSpace(ct[:idx])
	}
	finalURL := resp.Request.URL.String()
	return body, ct, finalURL, nil
}

func extractReadableText(html string, maxChars int) string {
	html = regexp.MustCompile(`(?is)<script[^>]*>.*?</script>`).ReplaceAllString(html, " ")
	html = regexp.MustCompile(`(?is)<style[^>]*>.*?</style>`).ReplaceAllString(html, " ")
	text := stripTags(html)
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)
	if maxChars > 0 && utf8.RuneCountInString(text) > maxChars {
		runes := []rune(text)
		text = string(runes[:maxChars]) + "…"
	}
	return text
}

func stripTags(s string) string {
	re := regexp.MustCompile(`(?s)<[^>]*>`)
	return strings.TrimSpace(re.ReplaceAllString(s, " "))
}

func htmlUnescape(s string) string {
	s = strings.ReplaceAll(s, "&amp;", "&")
	s = strings.ReplaceAll(s, "&lt;", "<")
	s = strings.ReplaceAll(s, "&gt;", ">")
	s = strings.ReplaceAll(s, "&quot;", "\"")
	s = strings.ReplaceAll(s, "&#39;", "'")
	return s
}

func filenameFromURL(rawURL, mime string) string {
	u, err := url.Parse(rawURL)
	if err == nil {
		base := filepath.Base(u.Path)
		if base != "" && base != "." && base != "/" {
			return sanitizeFilename(base)
		}
	}
	ext := ".jpg"
	switch {
	case strings.Contains(mime, "png"):
		ext = ".png"
	case strings.Contains(mime, "gif"):
		ext = ".gif"
	case strings.Contains(mime, "webp"):
		ext = ".webp"
	}
	return "image" + ext
}

func sanitizeFilename(name string) string {
	name = filepath.Base(strings.TrimSpace(name))
	if name == "" || name == "." {
		return "download.bin"
	}
	var b strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	out := b.String()
	if out == "" {
		return "download.bin"
	}
	return out
}

// StripOpenOctaAttachmentsMarker removes the machine-readable attachment payload from tool output text.
func StripOpenOctaAttachmentsMarker(output string) string {
	idx := strings.Index(output, openOctaAttachmentsMarker)
	if idx < 0 {
		return output
	}
	return strings.TrimSpace(output[:idx])
}

// ParseOpenOctaAttachments extracts attachment blocks embedded in tool output.
func ParseOpenOctaAttachments(output string) []map[string]interface{} {
	idx := strings.Index(output, openOctaAttachmentsMarker)
	if idx < 0 {
		return nil
	}
	raw := strings.TrimSpace(output[idx+len(openOctaAttachmentsMarker):])
	var attachments []openOctaAttachment
	if err := json.Unmarshal([]byte(raw), &attachments); err != nil {
		return nil
	}
	out := make([]map[string]interface{}, 0, len(attachments))
	for _, a := range attachments {
		switch strings.ToLower(strings.TrimSpace(a.Type)) {
		case "image":
			block := map[string]interface{}{
				"type": "image",
				"source": map[string]interface{}{
					"type":       "base64",
					"media_type": a.MimeType,
					"data":       a.Data,
				},
			}
			if a.Filename != "" {
				block["filename"] = a.Filename
			}
			if a.URL != "" {
				block["url"] = a.URL
			}
			out = append(out, block)
		case "file", "document", "attachment":
			block := map[string]interface{}{
				"type":     "file",
				"mimeType": a.MimeType,
				"filename": a.Filename,
			}
			if a.Data != "" {
				block["source"] = map[string]interface{}{
					"type":       "base64",
					"media_type": a.MimeType,
					"data":       a.Data,
				}
			}
			if a.URL != "" {
				block["url"] = a.URL
			}
			out = append(out, block)
		}
	}
	return out
}
