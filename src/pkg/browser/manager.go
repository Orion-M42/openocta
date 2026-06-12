package browser

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/input"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"
	"github.com/openocta/openocta/pkg/config"
)

// Service manages a single headed Chromium instance for OpenOcta.
type Service struct {
	mu      sync.Mutex
	cfg     *config.OpenOctaConfig
	env     func(string) string
	browser *rod.Browser
	l       *launcher.Launcher
	cdpURL  string
	tabByID map[string]*tabEntry
	labels  map[string]string
	nextTab int
	active  string
}

type tabEntry struct {
	id    string
	label string
	page  *rod.Page
}

// NewService creates a browser service bound to config.
func NewService(cfg *config.OpenOctaConfig, env func(string) string) *Service {
	return &Service{
		cfg:     cfg,
		env:     env,
		tabByID: make(map[string]*tabEntry),
		labels:  make(map[string]string),
	}
}

var (
	defaultSvc   *Service
	defaultSvcMu sync.Mutex
)

// DefaultService returns the process-wide browser service.
func DefaultService(cfg *config.OpenOctaConfig, env func(string) string) *Service {
	defaultSvcMu.Lock()
	defer defaultSvcMu.Unlock()
	if defaultSvc == nil {
		defaultSvc = NewService(cfg, env)
	} else if cfg != nil {
		defaultSvc.cfg = cfg
	}
	if env != nil {
		defaultSvc.env = env
	}
	return defaultSvc
}

// HandleRequest dispatches browser.request actions (OpenClaw-compatible subset).
func HandleRequest(ctx context.Context, cfg *config.OpenOctaConfig, env func(string) string, params map[string]interface{}) (map[string]interface{}, error) {
	svc := DefaultService(cfg, env)
	action, _ := params["action"].(string)
	action = strings.TrimSpace(strings.ToLower(action))
	if action == "" {
		return nil, fmt.Errorf("action is required")
	}
	switch action {
	case "status":
		return svc.status(ctx)
	case "start":
		return svc.start(ctx)
	case "stop":
		return svc.stop(ctx)
	case "tabs":
		return svc.listTabs(ctx)
	case "open":
		return svc.open(ctx, params)
	case "close":
		return svc.closeTab(ctx, params)
	case "navigate":
		return svc.navigate(ctx, params)
	case "snapshot":
		return svc.snapshot(ctx, params)
	case "screenshot":
		return svc.screenshot(ctx, params)
	case "act":
		return svc.act(ctx, params)
	default:
		return nil, fmt.Errorf("unsupported browser action: %s", action)
	}
}

func (s *Service) status(_ context.Context) (map[string]interface{}, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	running := s.browser != nil
	out := map[string]interface{}{
		"ok":      true,
		"running": running,
		"driver":  "openocta-bundled-chromium",
	}
	if running {
		out["cdpUrl"] = s.cdpURL
	}
	bin, err := ResolveChromiumExecutable(s.cfg, s.env)
	if err != nil {
		out["chromiumReady"] = false
		out["chromiumError"] = err.Error()
	} else {
		out["chromiumReady"] = true
		out["chromiumPath"] = bin
	}
	out["tabCount"] = len(s.tabByID)
	return out, nil
}

func (s *Service) start(ctx context.Context) (map[string]interface{}, error) {
	if err := s.ensureBrowser(ctx); err != nil {
		return nil, err
	}
	st, _ := s.status(ctx)
	return st, nil
}

func (s *Service) stop(_ context.Context) (map[string]interface{}, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.browser != nil {
		_ = s.browser.Close()
		s.browser = nil
	}
	if s.l != nil {
		s.l.Kill()
		s.l = nil
	}
	s.tabByID = make(map[string]*tabEntry)
	s.labels = make(map[string]string)
	s.nextTab = 0
	s.active = ""
	s.cdpURL = ""
	return map[string]interface{}{"ok": true, "running": false}, nil
}

func (s *Service) listTabs(_ context.Context) (map[string]interface{}, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	list := make([]map[string]interface{}, 0, len(s.tabByID))
	for _, t := range s.tabByID {
		if t == nil || t.page == nil {
			continue
		}
		info, err := t.page.Info()
		url := ""
		title := ""
		if err == nil && info != nil {
			url = info.URL
			title = info.Title
		}
		item := map[string]interface{}{
			"targetId": t.id,
			"url":      url,
			"title":    title,
		}
		if t.label != "" {
			item["label"] = t.label
			item["suggestedTargetId"] = t.label
		} else {
			item["suggestedTargetId"] = t.id
		}
		list = append(list, item)
	}
	return map[string]interface{}{"ok": true, "tabs": list}, nil
}

func (s *Service) open(ctx context.Context, params map[string]interface{}) (map[string]interface{}, error) {
	rawURL, _ := params["url"].(string)
	if u, ok := params["targetUrl"].(string); ok && strings.TrimSpace(rawURL) == "" {
		rawURL = u
	}
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return nil, fmt.Errorf("url is required")
	}
	label, _ := params["label"].(string)
	label = strings.TrimSpace(label)

	if err := s.ensureBrowser(ctx); err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	page, err := s.browser.Page(proto.TargetCreateTarget{URL: rawURL})
	if err != nil {
		return nil, fmt.Errorf("open tab: %w", err)
	}
	page = page.Context(ctx)
	_ = page.WaitLoad()
	id := s.registerTab(page, label)
	s.active = id
	suggested := id
	if label != "" {
		suggested = label
	}
	info, _ := page.Info()
	out := map[string]interface{}{
		"ok":                true,
		"targetId":          id,
		"suggestedTargetId": suggested,
		"url":               rawURL,
	}
	if info != nil {
		out["title"] = info.Title
		out["url"] = info.URL
	}
	return out, nil
}

func (s *Service) closeTab(ctx context.Context, params map[string]interface{}) (map[string]interface{}, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.browser == nil {
		return nil, fmt.Errorf("browser not running")
	}
	entry, err := s.resolveTabLocked(params)
	if err != nil {
		return nil, err
	}
	targetID := entry.page.TargetID
	if err := entry.page.Close(); err != nil {
		return nil, err
	}
	delete(s.tabByID, entry.id)
	if entry.label != "" {
		delete(s.labels, entry.label)
	}
	_ = ctx
	return map[string]interface{}{"ok": true, "closedTargetId": string(targetID)}, nil
}

func (s *Service) navigate(ctx context.Context, params map[string]interface{}) (map[string]interface{}, error) {
	rawURL, _ := params["url"].(string)
	if u, ok := params["targetUrl"].(string); ok && strings.TrimSpace(rawURL) == "" {
		rawURL = u
	}
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return nil, fmt.Errorf("url is required")
	}
	if err := s.ensureBrowser(ctx); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, err := s.resolveTabLocked(params)
	if err != nil {
		return nil, err
	}
	page := entry.page.Context(ctx)
	if err := page.Navigate(rawURL); err != nil {
		return nil, err
	}
	if err := page.WaitLoad(); err != nil {
		return nil, err
	}
	info, _ := page.Info()
	out := map[string]interface{}{
		"ok":                true,
		"targetId":          entry.id,
		"suggestedTargetId": s.suggestedTargetID(entry),
		"url":               rawURL,
	}
	if info != nil {
		out["title"] = info.Title
		out["url"] = info.URL
	}
	return out, nil
}

func (s *Service) snapshot(ctx context.Context, params map[string]interface{}) (map[string]interface{}, error) {
	if err := s.ensureBrowser(ctx); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, err := s.resolveTabLocked(params)
	if err != nil {
		return nil, err
	}
	page := entry.page.Context(ctx)
	obj, err := page.Eval(snapshotScript)
	if err != nil {
		return nil, fmt.Errorf("snapshot: %w", err)
	}
	result := obj.Value.Map()
	out := map[string]interface{}{
		"ok":                true,
		"targetId":          entry.id,
		"suggestedTargetId": s.suggestedTargetID(entry),
		"format":            "ai",
		"url":               result["url"].String(),
		"title":             result["title"].String(),
		"snapshot":          result["snapshot"].String(),
		"text":              result["snapshot"].String(),
		"refCount":          result["refCount"].Int(),
	}
	return out, nil
}

func (s *Service) screenshot(ctx context.Context, params map[string]interface{}) (map[string]interface{}, error) {
	if err := s.ensureBrowser(ctx); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, err := s.resolveTabLocked(params)
	if err != nil {
		return nil, err
	}
	page := entry.page.Context(ctx)
	img, err := page.Screenshot(true, nil)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"ok":                true,
		"targetId":          entry.id,
		"suggestedTargetId": s.suggestedTargetID(entry),
		"format":            "png",
		"base64":            base64.StdEncoding.EncodeToString(img),
	}, nil
}

func (s *Service) act(ctx context.Context, params map[string]interface{}) (map[string]interface{}, error) {
	if err := s.ensureBrowser(ctx); err != nil {
		return nil, err
	}
	req, _ := params["request"].(map[string]interface{})
	if req == nil {
		req = params
	}
	kind, _ := req["kind"].(string)
	kind = strings.TrimSpace(strings.ToLower(kind))
	if kind == "" {
		return nil, fmt.Errorf("request.kind is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	entry, err := s.resolveTabLocked(params)
	if err != nil {
		return nil, err
	}
	page := entry.page.Context(ctx)

	switch kind {
	case "click":
		ref, _ := req["ref"].(string)
		ref = strings.TrimSpace(ref)
		if ref == "" {
			return nil, fmt.Errorf("request.ref is required for click")
		}
		script := fmt.Sprintf(`() => { const el = document.querySelector('[data-openocta-ref=%q]'); if (!el) throw new Error('ref not found'); el.click(); return true; }`, ref)
		if _, err := page.Eval(script); err != nil {
			return nil, err
		}
	case "type":
		ref, _ := req["ref"].(string)
		text, _ := req["text"].(string)
		ref = strings.TrimSpace(ref)
		if ref == "" {
			return nil, fmt.Errorf("request.ref is required for type")
		}
		textJSON, err := json.Marshal(text)
		if err != nil {
			return nil, err
		}
		script := fmt.Sprintf(`() => { const el = document.querySelector('[data-openocta-ref=%q]'); if (!el) throw new Error('ref not found'); el.focus(); const v = %s; if ('value' in el) el.value = v; else el.textContent = v; el.dispatchEvent(new Event('input', { bubbles: true })); return true; }`, ref, string(textJSON))
		if _, err := page.Eval(script); err != nil {
			return nil, err
		}
	case "press":
		key, _ := req["key"].(string)
		key = strings.TrimSpace(key)
		if key == "" {
			return nil, fmt.Errorf("request.key is required for press")
		}
		k, err := keyForPress(key)
		if err != nil {
			return nil, err
		}
		if err := page.Keyboard.Press(k); err != nil {
			return nil, err
		}
	case "wait":
		text, _ := req["text"].(string)
		text = strings.TrimSpace(text)
		if text == "" {
			return nil, fmt.Errorf("request.text is required for wait")
		}
		deadline := time.Now().Add(30 * time.Second)
		for time.Now().Before(deadline) {
			obj, err := page.Eval(`() => document.body ? document.body.innerText : ""`)
			if err == nil && strings.Contains(obj.Value.String(), text) {
				break
			}
			time.Sleep(300 * time.Millisecond)
		}
	default:
		return nil, fmt.Errorf("unsupported act kind: %s", kind)
	}

	return map[string]interface{}{
		"ok":                true,
		"targetId":          entry.id,
		"suggestedTargetId": s.suggestedTargetID(entry),
		"kind":              kind,
	}, nil
}

func keyForPress(key string) (input.Key, error) {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "enter":
		return input.Enter, nil
	case "tab":
		return input.Tab, nil
	case "escape", "esc":
		return input.Escape, nil
	default:
		return 0, fmt.Errorf("unsupported key: %s (supported: Enter, Tab, Escape)", key)
	}
}

func (s *Service) ensureBrowser(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.browser != nil {
		return nil
	}
	bin, err := ResolveChromiumExecutable(s.cfg, s.env)
	if err != nil {
		return err
	}
	if err := validateChromiumExecutable(bin); err != nil {
		return err
	}
	profile := ResolveUserDataDir(s.env)
	headless := headlessFromConfig(s.cfg, s.env)
	l := launcher.New().
		Bin(bin).
		UserDataDir(profile).
		Headless(headless).
		Devtools(true).
		Set("disable-blink-features", "AutomationControlled").
		Set("no-first-run").
		Set("no-default-browser-check")
	// leakless + headed system Chrome on macOS can SIGSEGV; CfT is launched without leakless when headed.
	if !headless {
		l = l.Leakless(false)
	}
	u, err := l.Launch()
	if err != nil {
		return fmt.Errorf("launch chromium: %w", err)
	}
	b := rod.New().ControlURL(u).Context(ctx)
	if err := b.Connect(); err != nil {
		l.Kill()
		return fmt.Errorf("connect cdp: %w", err)
	}
	s.l = l
	s.browser = b
	s.cdpURL = u
	if len(s.tabByID) == 0 {
		page, err := b.Page(proto.TargetCreateTarget{URL: "about:blank"})
		if err == nil {
			s.registerTabLocked(page, "")
		}
	}
	return nil
}

func (s *Service) registerTab(page *rod.Page, label string) string {
	s.nextTab++
	id := fmt.Sprintf("t%d", s.nextTab)
	entry := &tabEntry{id: id, label: label, page: page}
	s.tabByID[id] = entry
	if label != "" {
		s.labels[label] = id
	}
	return id
}

func (s *Service) registerTabLocked(page *rod.Page, label string) string {
	return s.registerTab(page, label)
}

func (s *Service) resolveTabLocked(params map[string]interface{}) (*tabEntry, error) {
	if len(s.tabByID) == 0 {
		return nil, fmt.Errorf("no open tabs")
	}
	target, _ := params["targetId"].(string)
	target = strings.TrimSpace(target)
	if target == "" && s.active != "" {
		if entry, ok := s.tabByID[s.active]; ok {
			return entry, nil
		}
	}
	if target == "" {
		for _, t := range s.tabByID {
			return t, nil
		}
	}
	if id, ok := s.labels[target]; ok {
		if entry, ok := s.tabByID[id]; ok {
			return entry, nil
		}
	}
	if entry, ok := s.tabByID[target]; ok {
		return entry, nil
	}
	return nil, fmt.Errorf("tab not found: %s", target)
}

func (s *Service) suggestedTargetID(entry *tabEntry) string {
	if entry == nil {
		return ""
	}
	if entry.label != "" {
		return entry.label
	}
	return entry.id
}
