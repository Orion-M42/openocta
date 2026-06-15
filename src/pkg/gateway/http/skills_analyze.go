package http

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/openocta/openocta/pkg/gateway/handlers"
)

const skillAnalyzeMaxSize = 50 << 20 // 50 MB

func listZipFiles(buf []byte) ([]string, error) {
	zr, err := zip.NewReader(bytes.NewReader(buf), int64(len(buf)))
	if err != nil {
		return nil, err
	}
	files := make([]string, 0, len(zr.File))
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		clean := filepath.ToSlash(filepath.Clean(f.Name))
		if strings.Contains(clean, "..") {
			continue
		}
		files = append(files, clean)
	}
	return files, nil
}

// handleSkillsAnalyze handles POST /api/skills/analyze (multipart: file).
func (s *Server) handleSkillsAnalyze(w http.ResponseWriter, r *http.Request) {
	setSkillsAPICORSHeaders(w)
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, skillAnalyzeMaxSize)
	if err := r.ParseMultipartForm(skillAnalyzeMaxSize); err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, "failed to parse form: "+err.Error(), "")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, "file is required: "+err.Error(), "")
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	isZip := strings.Contains(contentType, "zip") || strings.HasSuffix(strings.ToLower(header.Filename), ".zip")
	if !isZip {
		writeSkillsUploadError(w, http.StatusBadRequest, "only .zip files are supported", "")
		return
	}

	buf, err := io.ReadAll(io.LimitReader(file, skillAnalyzeMaxSize))
	if err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, "failed to read file: "+err.Error(), "")
		return
	}

	skillContent, err := extractSkillFromZip(bytes.NewReader(buf), int64(len(buf)))
	if err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, err.Error(), "")
		return
	}

	valid, errMsg, template := validateSkillContent(skillContent, "my-skill")
	if !valid {
		writeSkillsUploadError(w, http.StatusBadRequest, errMsg, template)
		return
	}

	zipFiles, _ := listZipFiles(buf)
	opts := handlers.HandlerOpts{Context: s.ctx}
	result, _ := handlers.AnalyzeSkillContent(r.Context(), opts, string(skillContent), zipFiles)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":            true,
		"name":          result.Name,
		"description":   result.Description,
		"category":      result.Category,
		"tags":          result.Tags,
		"summary":       result.Summary,
		"allowedTools":  result.AllowedTools,
		"files":         result.Files,
		"skillMarkdown": result.SkillMD,
		"zipSize":       len(buf),
		"zipFilename":   header.Filename,
	})
}

// handleSkillsPublish handles POST /api/skills/publish — upload zip with metadata.
func (s *Server) handleSkillsPublish(w http.ResponseWriter, r *http.Request) {
	setSkillsAPICORSHeaders(w)
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, skillAnalyzeMaxSize)
	if err := r.ParseMultipartForm(skillAnalyzeMaxSize); err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, "failed to parse form: "+err.Error(), "")
		return
	}

	nameRaw := strings.TrimSpace(r.FormValue("name"))
	description := strings.TrimSpace(r.FormValue("description"))
	category := strings.TrimSpace(r.FormValue("category"))
	tags := strings.TrimSpace(r.FormValue("tags"))
	status := strings.TrimSpace(r.FormValue("status"))

	file, header, err := r.FormFile("file")
	if err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, "file is required: "+err.Error(), "")
		return
	}
	defer file.Close()

	if nameRaw == "" {
		base := filepath.Base(header.Filename)
		if strings.HasSuffix(strings.ToLower(base), ".zip") {
			base = base[:len(base)-4]
		}
		nameRaw = strings.TrimSpace(base)
	}
	if nameRaw == "" || !validateSkillName(nameRaw) {
		writeSkillsUploadError(w, http.StatusBadRequest,
			"name must be 1-64 chars, letters, numbers, hyphens, underscores, dots (no ..)", "")
		return
	}

	buf, err := io.ReadAll(io.LimitReader(file, skillAnalyzeMaxSize))
	if err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, "failed to read file: "+err.Error(), "")
		return
	}

	// Reuse upload logic by writing to a temp multipart-like flow: call internal publish
	if err := s.publishSkillZip(buf, nameRaw, description, category, tags, status); err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, err.Error(), "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":   true,
		"name": nameRaw,
	})
}

// publishSkillZipToManaged extracts a zip skill package and writes metadata into SKILL.md frontmatter.
func publishSkillZipToManaged(buf []byte, nameRaw, description, category, tags, status string) error {
	skillContent, err := extractSkillFromZip(bytes.NewReader(buf), int64(len(buf)))
	if err != nil {
		return err
	}
	valid, errMsg, _ := validateSkillContent(skillContent, nameRaw)
	if !valid {
		return fmt.Errorf("%s", errMsg)
	}

	env := func(k string) string { return os.Getenv(k) }
	managedDir := handlers.ResolveManagedSkillsDir(env)
	targetDir := filepath.Join(managedDir, nameRaw)

	if err := os.MkdirAll(managedDir, 0755); err != nil {
		return fmt.Errorf("failed to create skills dir: %w", err)
	}
	_ = os.RemoveAll(targetDir)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return fmt.Errorf("failed to create skill dir: %w", err)
	}

	zr, err := zip.NewReader(bytes.NewReader(buf), int64(len(buf)))
	if err != nil {
		return fmt.Errorf("invalid zip: %w", err)
	}
	prefix := ""
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		clean := filepath.ToSlash(filepath.Clean(f.Name))
		if strings.Contains(clean, "..") {
			continue
		}
		lower := strings.ToLower(clean)
		if strings.HasSuffix(lower, "skill.md") {
			dir := path.Dir(clean)
			if dir != "." {
				prefix = dir + "/"
			}
			break
		}
	}
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		clean := filepath.ToSlash(filepath.Clean(f.Name))
		if strings.Contains(clean, "..") {
			continue
		}
		rel := clean
		if prefix != "" && strings.HasPrefix(clean, prefix) {
			rel = strings.TrimPrefix(clean, prefix)
		}
		if rel == "" || (prefix != "" && !strings.HasPrefix(clean, prefix)) {
			continue
		}
		dest := filepath.Join(targetDir, filepath.FromSlash(rel))
		_ = os.MkdirAll(filepath.Dir(dest), 0755)
		rc, err := f.Open()
		if err != nil {
			continue
		}
		data, _ := io.ReadAll(io.LimitReader(rc, 1<<20))
		rc.Close()
		_ = os.WriteFile(dest, data, 0644)
	}

	skillPath := filepath.Join(targetDir, "SKILL.md")
	if data, err := os.ReadFile(skillPath); err == nil {
		updated := setFrontmatterField(data, "displayName", nameRaw)
		if description != "" {
			updated = setFrontmatterField(updated, "description", description)
		}
		if category != "" {
			updated = setFrontmatterField(updated, "category", category)
		}
		if tags != "" {
			updated = setFrontmatterField(updated, "tags", tags)
		}
		if status != "" {
			updated = setFrontmatterField(updated, "status", status)
		}
		updated = setFrontmatterField(updated, "name", nameRaw)
		_ = os.WriteFile(skillPath, updated, 0644)
	}
	return nil
}

func (s *Server) publishSkillZip(buf []byte, nameRaw, description, category, tags, status string) error {
	_ = s
	return publishSkillZipToManaged(buf, nameRaw, description, category, tags, status)
}

func buildSkillZipFromMarkdown(markdown string) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, err := zw.Create("SKILL.md")
	if err != nil {
		return nil, err
	}
	if _, err := w.Write([]byte(markdown)); err != nil {
		return nil, err
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// handleSkillsPublishMarkdown handles POST /api/skills/publish-markdown (form: name, description, category, tags, status, markdown).
func (s *Server) handleSkillsPublishMarkdown(w http.ResponseWriter, r *http.Request) {
	setSkillsAPICORSHeaders(w)
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseForm(); err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, "failed to parse form: "+err.Error(), "")
		return
	}
	nameRaw := strings.TrimSpace(r.FormValue("name"))
	description := strings.TrimSpace(r.FormValue("description"))
	category := strings.TrimSpace(r.FormValue("category"))
	tags := strings.TrimSpace(r.FormValue("tags"))
	status := strings.TrimSpace(r.FormValue("status"))
	markdown := r.FormValue("markdown")
	if nameRaw == "" || !validateSkillName(nameRaw) {
		writeSkillsUploadError(w, http.StatusBadRequest, "valid name is required", "")
		return
	}
	if strings.TrimSpace(markdown) == "" {
		writeSkillsUploadError(w, http.StatusBadRequest, "markdown is required", "")
		return
	}
	valid, errMsg, template := validateSkillContent([]byte(markdown), nameRaw)
	if !valid {
		writeSkillsUploadError(w, http.StatusBadRequest, errMsg, template)
		return
	}
	buf, err := buildSkillZipFromMarkdown(markdown)
	if err != nil {
		writeSkillsUploadError(w, http.StatusInternalServerError, err.Error(), "")
		return
	}
	if err := publishSkillZipToManaged(buf, nameRaw, description, category, tags, status); err != nil {
		writeSkillsUploadError(w, http.StatusBadRequest, err.Error(), "")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "name": nameRaw})
}
