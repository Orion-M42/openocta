package http

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/openocta/openocta/pkg/browser"
	"github.com/openocta/openocta/pkg/config"
)

type browserRequestBody struct {
	Action    string                 `json:"action"`
	URL       string                 `json:"url,omitempty"`
	TargetURL string                 `json:"targetUrl,omitempty"`
	TargetID  string                 `json:"targetId,omitempty"`
	Label     string                 `json:"label,omitempty"`
	Request   map[string]interface{} `json:"request,omitempty"`
}

type browserAPIResponse struct {
	OK      bool                   `json:"ok"`
	Payload map[string]interface{} `json:"payload,omitempty"`
	Message string                 `json:"message,omitempty"`
	Detail  string                 `json:"detail,omitempty"`
}

func (s *Server) handleBrowserOptions(w http.ResponseWriter, r *http.Request) {
	setSiteProxyCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func (s *Server) handleBrowserRequest(w http.ResponseWriter, r *http.Request) {
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, X-Gateway-Token")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(browserAPIResponse{OK: false, Message: "仅支持 POST"})
		return
	}

	var body browserRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(browserAPIResponse{OK: false, Message: "请求体无效", Detail: err.Error()})
		return
	}

	cfg := s.browserConfig()
	payload, err := browser.HandleRequest(r.Context(), cfg, os.Getenv, browserParamsFromBody(body))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(browserAPIResponse{OK: false, Message: err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(browserAPIResponse{OK: true, Payload: payload})
}

func (s *Server) handleBrowserPreview(w http.ResponseWriter, r *http.Request) {
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, X-Gateway-Token")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(browserAPIResponse{OK: false, Message: "仅支持 GET"})
		return
	}

	includeScreenshot := true
	if raw := strings.TrimSpace(r.URL.Query().Get("screenshot")); raw != "" {
		includeScreenshot = raw != "0" && !strings.EqualFold(raw, "false")
	}
	opts := browser.PreviewOptions{
		TargetID:          strings.TrimSpace(r.URL.Query().Get("targetId")),
		IncludeScreenshot: includeScreenshot,
	}
	cfg := s.browserConfig()
	payload, err := browser.PreviewState(r.Context(), cfg, os.Getenv, opts)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(browserAPIResponse{OK: false, Message: err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(payload)
}

func (s *Server) handleDesktopBrowser(w http.ResponseWriter, r *http.Request) {
	s.handleBrowserRequest(w, r)
}

func (s *Server) browserConfig() *config.OpenOctaConfig {
	if s != nil && s.ctx != nil {
		return s.ctx.Config
	}
	return nil
}

func browserParamsFromBody(body browserRequestBody) map[string]interface{} {
	params := map[string]interface{}{
		"action": strings.TrimSpace(body.Action),
	}
	if u := strings.TrimSpace(body.URL); u != "" {
		params["url"] = u
	}
	if u := strings.TrimSpace(body.TargetURL); u != "" {
		params["targetUrl"] = u
	}
	if id := strings.TrimSpace(body.TargetID); id != "" {
		params["targetId"] = id
	}
	if label := strings.TrimSpace(body.Label); label != "" {
		params["label"] = label
	}
	if body.Request != nil {
		params["request"] = body.Request
	}
	return params
}
