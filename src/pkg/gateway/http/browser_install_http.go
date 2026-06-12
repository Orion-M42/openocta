package http

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/openocta/openocta/pkg/browser"
)

func (s *Server) handleBrowserInstallStatus(w http.ResponseWriter, r *http.Request) {
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, X-Gateway-Token")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "message": "仅支持 GET"})
		return
	}
	_ = json.NewEncoder(w).Encode(browser.InstallStatus(os.Getenv))
}

func (s *Server) handleBrowserInstallStart(w http.ResponseWriter, r *http.Request) {
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, X-Gateway-Token")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "message": "仅支持 POST"})
		return
	}
	started, err := browser.StartInstallChromiumAsync(os.Getenv)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "message": err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":      true,
		"started": started,
		"status":  browser.InstallStatus(os.Getenv),
	})
}

func (s *Server) handleBrowserInstallCancel(w http.ResponseWriter, r *http.Request) {
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, X-Gateway-Token")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "message": "仅支持 POST"})
		return
	}
	cancelled := browser.CancelInstallChromium(os.Getenv)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":        true,
		"cancelled": cancelled,
		"status":    browser.InstallStatus(os.Getenv),
	})
}
