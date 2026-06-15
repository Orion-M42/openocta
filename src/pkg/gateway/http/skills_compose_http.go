package http

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/openocta/openocta/pkg/gateway/handlers"
	"github.com/openocta/openocta/pkg/gateway/protocol"
)

type skillsComposeHTTPBody struct {
	Messages []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"messages"`
	Draft           string `json:"draft"`
	Scenario        string `json:"scenario"`
	UpgradeSkillKey string `json:"upgradeSkillKey"`
	TimeoutMs       int    `json:"timeoutMs"`
}

func parseSkillsComposeHTTPMessages(body skillsComposeHTTPBody) []handlers.SkillComposeMessage {
	out := make([]handlers.SkillComposeMessage, 0, len(body.Messages))
	for _, m := range body.Messages {
		role := strings.TrimSpace(strings.ToLower(m.Role))
		content := strings.TrimSpace(m.Content)
		if role == "" || content == "" {
			continue
		}
		if role != "user" && role != "assistant" {
			continue
		}
		out = append(out, handlers.SkillComposeMessage{Role: role, Content: content})
	}
	return out
}

// handleSkillsCompose handles POST /api/skills/compose (JSON body).
func (s *Server) handleSkillsCompose(w http.ResponseWriter, r *http.Request) {
	setSkillsAPICORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var body skillsComposeHTTPBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, "invalid JSON: "+err.Error(), "")
		return
	}

	messages := parseSkillsComposeHTTPMessages(body)
	if len(messages) == 0 {
		writeSkillsUploadError(w, http.StatusBadRequest, "messages is required", "")
		return
	}

	timeoutMs := body.TimeoutMs
	if timeoutMs <= 0 {
		timeoutMs = 120000
	}

	opts := handlers.HandlerOpts{
		Context: s.ctx,
		Params: map[string]interface{}{
			"sessionKey": "main",
			"timeoutMs":  float64(timeoutMs),
		},
	}
	result, errShape := handlers.ComposeSkill(
		r.Context(),
		opts,
		messages,
		body.Draft,
		body.Scenario,
		body.UpgradeSkillKey,
		timeoutMs,
	)
	if errShape != nil {
		status := http.StatusInternalServerError
		if errShape.Code == protocol.ErrCodeInvalidRequest {
			status = http.StatusBadRequest
		}
		writeSkillsUploadError(w, status, errShape.Message, "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":    true,
		"reply": result["reply"],
		"draft": result["draft"],
		"files": result["files"],
		"ready": result["ready"],
	})
}
