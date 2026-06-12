package http

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	agentSkills "github.com/openocta/openocta/pkg/agent/skills"
	"github.com/openocta/openocta/pkg/employees"
	"github.com/openocta/openocta/pkg/gateway/handlers"
	"github.com/openocta/openocta/pkg/installmetadata"
)

const (
	siteAPIEnvKey         = "OPENOCTA_SITE_API_BASE_URL"
	siteAPIDefaultTimeout = 3 * time.Second
)

var (
	siteAPITransport     http.RoundTripper
	siteAPITransportOnce sync.Once
)

// siteAPIRoundTripper returns a shared transport for OPENOCTA_SITE_API_BASE_URL requests.
// TLS verification is skipped so self-signed or misconfigured HTTPS dev/staging hosts still work.
func siteAPIRoundTripper() http.RoundTripper {
	siteAPITransportOnce.Do(func() {
		base, ok := http.DefaultTransport.(*http.Transport)
		if !ok {
			siteAPITransport = &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec // intentional for site API compatibility
			}
			return
		}
		t := base.Clone()
		if t.TLSClientConfig == nil {
			t.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} //nolint:gosec
		} else {
			c := t.TLSClientConfig.Clone()
			c.InsecureSkipVerify = true //nolint:gosec
			t.TLSClientConfig = c
		}
		siteAPITransport = t
	})
	return siteAPITransport
}

// newSiteAPIHTTPClient is used for outbound requests to OPENOCTA_SITE_API_BASE_URL.
// 市场列表/详情/透传使用 siteAPIDefaultTimeout；安装包下载在 site_install.go 中单独设置更长超时。
func newSiteAPIHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout:   timeout,
		Transport: siteAPIRoundTripper(),
	}
}

// remoteIDFromItem 从员工 item 的 id 提取远程 id（number 转 string）
func remoteIDFromItem(id interface{}) string {
	if id == nil {
		return ""
	}
	switch v := id.(type) {
	case float64:
		return strconv.FormatInt(int64(v), 10)
	case int:
		return strconv.Itoa(v)
	case string:
		if strings.HasPrefix(v, "local:") {
			return ""
		}
		return v
	default:
		return fmt.Sprint(id)
	}
}

func setSiteProxyCORSHeaders(w http.ResponseWriter) {
	// Keep it permissive: Control UI may run on a different origin during dev
	// (e.g. localhost:5173 → 127.0.0.1:18900). No credentials, so "*" is safe.
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, X-Gateway-Token")
}

// writeSiteProxyGenericUnavailable 不向客户端暴露上游 URL 或底层错误信息。
func writeSiteProxyGenericUnavailable(w http.ResponseWriter) {
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusServiceUnavailable)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "服务暂不可用"})
}

func (s *Server) siteAPIBaseURL() string {
	raw := strings.TrimSpace(os.Getenv(siteAPIEnvKey))
	if raw == "" {
		// Back-compat / dev default: local swagger host.
		return ""
	}
	return strings.TrimRight(raw, "/")
}

// mergeSkillsListWithLocalManaged 合并官网技能列表与 ~/.openocta/skills 下本地技能（含用户上传），并刷新 installed。
func mergeSkillsListWithLocalManaged(skills []map[string]interface{}, env func(string) string) []map[string]interface{} {
	if skills == nil {
		skills = []map[string]interface{}{}
	}
	managedDir := handlers.ResolveManagedSkillsDir(env)
	skillInstallSet := installmetadata.SkillInstallSet(env)
	remoteFolders := make(map[string]struct{}, len(skills))
	for i := range skills {
		folder, ok := skills[i]["folder"].(string)
		if !ok {
			continue
		}
		folder = strings.TrimSpace(folder)
		if folder == "" {
			continue
		}
		remoteFolders[folder] = struct{}{}
		if _, ok := skillInstallSet[folder]; ok {
			skills[i]["installed"] = true
			continue
		}
		if _, err := os.Stat(filepath.Join(managedDir, folder, "SKILL.md")); err == nil {
			skills[i]["installed"] = true
		}
	}
	entries, err := agentSkills.LoadEntriesFromDir(managedDir, "openocta-managed")
	if err != nil || len(entries) == 0 {
		return skills
	}
	var extras []map[string]interface{}
	for _, e := range entries {
		folder := strings.TrimSpace(filepath.Base(e.BaseDir))
		if folder == "" || folder == "." {
			continue
		}
		if _, exists := remoteFolders[folder]; exists {
			continue
		}
		desc := ""
		if e.Frontmatter != nil {
			desc = strings.TrimSpace(e.Frontmatter["description"])
		}
		name := strings.TrimSpace(e.Name)
		if name == "" {
			name = folder
		}
		item := map[string]interface{}{
			"folder":      folder,
			"name":        name,
			"description": desc,
			"categoryCn":  "本地",
			"categories":  []map[string]interface{}{{"name": "本地"}},
			"tags":        "",
			"status":      "open",
			"installed":   true,
		}
		if e.Metadata != nil {
			if em := strings.TrimSpace(e.Metadata.Emoji); em != "" {
				item["emoji"] = em
			}
		}
		extras = append(extras, item)
	}
	sort.Slice(extras, func(i, j int) bool {
		fi, _ := extras[i]["folder"].(string)
		fj, _ := extras[j]["folder"].(string)
		return fi < fj
	})
	return append(skills, extras...)
}

// resolveInstalledMcpServerKey 将 .install-metadata.json 中的 localId 对齐到 openocta.json 里实际存在的 mcp.servers 键，
// 避免工具库卡片携带错误 serverKey 导致编辑弹窗读不到配置。
func resolveInstalledMcpServerKey(snap *handlers.ConfigSnapshot, metaKey string) string {
	metaKey = strings.TrimSpace(metaKey)
	if snap == nil || snap.Config == nil || snap.Config.Mcp == nil || len(snap.Config.Mcp.Servers) == 0 {
		return metaKey
	}
	servers := snap.Config.Mcp.Servers
	if metaKey != "" {
		if _, ok := servers[metaKey]; ok {
			return metaKey
		}
		lmeta := strings.ToLower(metaKey)
		for k := range servers {
			if strings.ToLower(k) == lmeta {
				return k
			}
		}
		var hits []string
		for k := range servers {
			lk := strings.ToLower(k)
			if strings.Contains(lk, lmeta) || strings.Contains(lmeta, lk) {
				hits = append(hits, k)
			}
		}
		if len(hits) == 1 {
			return hits[0]
		}
	}
	if len(servers) == 1 {
		for k := range servers {
			return k
		}
	}
	return metaKey
}

// appendLocalOnlyMcpsToMarketList 追加仅存在于本地配置、且当前列表中尚未以「已安装 + serverKey」展示的 MCP（用户手动添加或元数据 remoteId 与官网列表脱节时兜底）。
// 注意：不能仅用 install-metadata 的 localId 集合判断「已关联官网」——若元数据仍在但远程列表无对应 id，合并阶段不会打上 installed，仅用 localId 排除会导致该服务器从工具库彻底消失。
func appendLocalOnlyMcpsToMarketList(mcps []map[string]interface{}, env func(string) string) []map[string]interface{} {
	if mcps == nil {
		mcps = []map[string]interface{}{}
	}
	snap, err := handlers.LoadConfigSnapshot(env)
	if err != nil || snap.Config == nil || snap.Config.Mcp == nil || len(snap.Config.Mcp.Servers) == 0 {
		return mcps
	}
	alreadyRepresented := make(map[string]struct{})
	for _, item := range mcps {
		installed, _ := item["installed"].(bool)
		if !installed {
			continue
		}
		sk, _ := item["serverKey"].(string)
		sk = strings.TrimSpace(sk)
		if sk != "" {
			alreadyRepresented[sk] = struct{}{}
		}
	}
	var extras []map[string]interface{}
	for key := range snap.Config.Mcp.Servers {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if _, ok := alreadyRepresented[key]; ok {
			continue
		}
		extras = append(extras, map[string]interface{}{
			"id":          "local:" + key,
			"name":        key,
			"description": "本地配置的 MCP 服务器",
			"category":    "本地",
			"status":      "open",
			"tags":        "",
			"installed":   true,
			"serverKey":   key,
		})
	}
	sort.Slice(extras, func(i, j int) bool {
		ni, _ := extras[i]["name"].(string)
		nj, _ := extras[j]["name"].(string)
		return ni < nj
	})
	return append(mcps, extras...)
}

func tryWriteLocalSkillDetail(w http.ResponseWriter, managedDir, folder string) bool {
	skillFile := filepath.Join(managedDir, folder, "SKILL.md")
	data, err := os.ReadFile(skillFile)
	if err != nil {
		return false
	}
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	out := map[string]interface{}{
		"content":   string(data),
		"installed": true,
	}
	_ = json.NewEncoder(w).Encode(out)
	return true
}

func serveLocalMcpDetailJSON(w http.ResponseWriter, serverKey string, env func(string) string) bool {
	snap, err := handlers.LoadConfigSnapshot(env)
	if err != nil || snap.Config == nil || snap.Config.Mcp == nil {
		return false
	}
	entry, ok := snap.Config.Mcp.Servers[serverKey]
	if !ok {
		return false
	}
	raw, err := json.Marshal(entry)
	if err != nil {
		return false
	}
	var cfgObj map[string]interface{}
	if err := json.Unmarshal(raw, &cfgObj); err != nil {
		return false
	}
	detail := map[string]interface{}{
		"id":          "local:" + serverKey,
		"name":        serverKey,
		"description": "本地配置的 MCP 服务器",
		"category":    "本地",
		"status":      "open",
		"installed":   true,
		"serverKey":   serverKey,
		"config":      cfgObj,
	}
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(detail)
	return true
}

// proxySiteGETMode 控制官网不可达时的响应形态（不向客户端泄露上游地址或底层错误）。
type proxySiteGETMode int

const (
	proxySiteGETDownload         proxySiteGETMode = iota // 二进制/下载：503 + 通用 JSON
	proxySiteGETSilentJSONArray                          // 200 []
	proxySiteGETSilentJSONObject                         // 200 {}
	proxySiteGETNotFound                                 // 404 无 body
)

func (s *Server) proxySiteGET(w http.ResponseWriter, r *http.Request, upstreamPath string, onFail proxySiteGETMode) {
	setSiteProxyCORSHeaders(w)
	base := s.siteAPIBaseURL()
	u, err := url.Parse(base)
	if err != nil {
		proxySiteGETWriteFallback(w, onFail)
		return
	}

	// Preserve query string from incoming request.
	u.Path = strings.TrimRight(u.Path, "/") + upstreamPath
	u.RawQuery = r.URL.RawQuery

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
	if err != nil {
		proxySiteGETWriteFallback(w, onFail)
		return
	}
	req.Header.Set("Accept", "application/json")

	client := newSiteAPIHTTPClient(siteAPIDefaultTimeout)
	res, err := client.Do(req)
	if err != nil {
		proxySiteGETWriteFallback(w, onFail)
		return
	}
	defer res.Body.Close()

	// Copy content-type (fallback to json).
	ct := res.Header.Get("Content-Type")
	if ct == "" {
		ct = "application/json; charset=utf-8"
	}
	w.Header().Set("Content-Type", ct)
	w.WriteHeader(res.StatusCode)
	_, _ = io.Copy(w, res.Body)
}

func proxySiteGETWriteFallback(w http.ResponseWriter, mode proxySiteGETMode) {
	setSiteProxyCORSHeaders(w)
	switch mode {
	case proxySiteGETSilentJSONArray:
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("[]"))
	case proxySiteGETSilentJSONObject:
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("{}"))
	case proxySiteGETNotFound:
		w.WriteHeader(http.StatusNotFound)
	default:
		writeSiteProxyGenericUnavailable(w)
	}
}

// --- /api/v1 proxies ---

func (s *Server) handleSiteOptions(w http.ResponseWriter, r *http.Request) {
	setSiteProxyCORSHeaders(w)
	w.WriteHeader(http.StatusNoContent)
}

// employeeMarketItem 与官网 API 返回格式兼容，id 可为 number（远程）或 string（本地 "local:xxx"）
type employeeMarketItem struct {
	ID          interface{} `json:"id"` // number 或 "local:xxx"
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	LogoURL     string      `json:"logo_url,omitempty"`
	Category    string      `json:"category,omitempty"`
	Status      string      `json:"status,omitempty"`
	Tags        string      `json:"tags,omitempty"`
	// Readme 与官网员工详情一致；反序列化时必须保留该字段，否则详情弹层无法展示说明文档。
	Readme string `json:"readme,omitempty"`
	// Content 部分站点与技能详情一致用该字段承载 Markdown；合并进 Readme 后清空，避免重复。
	Content   string `json:"content,omitempty"`
	Enabled   *bool  `json:"enabled,omitempty"`   // 本地员工启用状态
	Installed bool   `json:"installed,omitempty"` // 从远程安装后刷新仍可识别
	LocalID   string `json:"localId,omitempty"`   // 安装后的本地 id
}

// writeEmployeeMarketItemFromLocalManifest 从本地员工目录生成与官网详情兼容的 JSON。
// markInstalled 为 true 时表示该员工来自市场安装记录（远程 id 与 localId 一并返回）。
func writeEmployeeMarketItemFromLocalManifest(w http.ResponseWriter, marketID, localID string, env func(string) string, markInstalled bool) bool {
	m, err := employees.LoadManifest(localID, env)
	if err != nil || m == nil {
		return false
	}
	typeVal := strings.TrimSpace(m.Type)
	if typeVal == "" {
		typeVal = "其它"
	}
	enabled := m.Enabled
	readme := ""
	readmePath := filepath.Join(employees.ResolveEmployeesDir(env), localID, "README.md")
	if data, err := os.ReadFile(readmePath); err == nil && len(data) > 0 {
		readme = string(data)
	}
	detail := employeeMarketItem{
		ID:          marketID,
		Name:        m.Name,
		Description: m.Description,
		Category:    typeVal,
		Status:      "open",
		Readme:      readme,
		Enabled:     &enabled,
	}
	if markInstalled {
		detail.Installed = true
		detail.LocalID = localID
	}
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(detail)
	return true
}

func (s *Server) handleSiteEmployees(w http.ResponseWriter, r *http.Request) {
	// /api/v1/employees：合并远程 + 本地自建员工
	setSiteProxyCORSHeaders(w)
	base := s.siteAPIBaseURL()
	var remote []employeeMarketItem
	if u, err := url.Parse(base); err == nil {
		u.Path = strings.TrimRight(u.Path, "/") + "/api/v1/employees"
		u.RawQuery = r.URL.RawQuery
		req, _ := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
		req.Header.Set("Accept", "application/json")
		client := newSiteAPIHTTPClient(siteAPIDefaultTimeout)
		if res, err := client.Do(req); err == nil && res != nil {
			if res.StatusCode == http.StatusOK {
				_ = json.NewDecoder(res.Body).Decode(&remote)
			}
			res.Body.Close()
		}
	}
	if remote == nil {
		remote = []employeeMarketItem{}
	}

	env := func(k string) string { return os.Getenv(k) }
	empInstallMap := installmetadata.EmployeeInstallMap(env)
	// 已由远程安装覆盖的本地 id 集合（以 id 为主去重，避免同一员工展示两次）
	installedLocalIDs := make(map[string]struct{})
	for i := range remote {
		rid := remoteIDFromItem(remote[i].ID)
		if rid != "" {
			if localID, ok := empInstallMap[rid]; ok {
				remote[i].Installed = true
				remote[i].LocalID = localID
				installedLocalIDs[localID] = struct{}{}
			}
		}
	}

	localList, _ := employees.ListSummaries(env)
	localItems := make([]employeeMarketItem, 0, len(localList))
	for _, e := range localList {
		if _, covered := installedLocalIDs[e.ID]; covered {
			continue // 该本地员工已由远程项展示（Installed+LocalID），不再重复
		}
		enabled := e.Enabled
		localItems = append(localItems, employeeMarketItem{
			ID:          "local:" + e.ID,
			Name:        e.Name,
			Description: e.Description,
			Category:    e.Type,
			Status:      "open",
			Enabled:     &enabled,
		})
	}

	merged := append(remote, localItems...)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(merged)
}

func (s *Server) handleSiteEmployeeDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.Contains(id, "/") {
		http.NotFound(w, r)
		return
	}
	if strings.HasPrefix(id, "local:") {
		localID := strings.TrimPrefix(id, "local:")
		env := func(k string) string { return os.Getenv(k) }
		if !writeEmployeeMarketItemFromLocalManifest(w, id, localID, env, false) {
			http.NotFound(w, r)
		}
		return
	}
	// 远程员工详情：代理后合并 installed/localId；官网不可用时仅返回已安装员工的本地详情
	env := func(k string) string { return os.Getenv(k) }
	empMap := installmetadata.EmployeeInstallMap(env)
	tryLocalFromRemoteMarket := func() bool {
		if localID, ok := empMap[id]; ok {
			return writeEmployeeMarketItemFromLocalManifest(w, id, localID, env, true)
		}
		return false
	}

	base := s.siteAPIBaseURL()
	u, err := url.Parse(base)
	if err != nil {
		if tryLocalFromRemoteMarket() {
			return
		}
		http.NotFound(w, r)
		return
	}
	u.Path = strings.TrimRight(u.Path, "/") + "/api/v1/employees/" + url.PathEscape(id)
	req, _ := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
	req.Header.Set("Accept", "application/json")
	client := newSiteAPIHTTPClient(siteAPIDefaultTimeout)
	res, err := client.Do(req)
	if err != nil {
		if tryLocalFromRemoteMarket() {
			return
		}
		http.NotFound(w, r)
		return
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	var detail employeeMarketItem
	if res.StatusCode != http.StatusOK || json.Unmarshal(body, &detail) != nil {
		if tryLocalFromRemoteMarket() {
			return
		}
		http.NotFound(w, r)
		return
	}
	if detail.Readme == "" && detail.Content != "" {
		detail.Readme = detail.Content
	}
	detail.Content = ""
	if localID, ok := empMap[id]; ok {
		detail.Installed = true
		detail.LocalID = localID
	}
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(detail)
}

func (s *Server) handleSiteEmployeeDownload(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.Contains(id, "/") {
		http.NotFound(w, r)
		return
	}
	if strings.HasPrefix(id, "local:") {
		// 本地员工已存在，无需下载
		setSiteProxyCORSHeaders(w)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "本地员工无需下载，已获取",
		})
		return
	}
	s.proxySiteGET(w, r, "/api/v1/employees/"+url.PathEscape(id)+"/download", proxySiteGETDownload)
}

func (s *Server) handleSiteMcps(w http.ResponseWriter, r *http.Request) {
	// 代理 MCP 列表并合并 .install-metadata.json 中的已安装状态
	setSiteProxyCORSHeaders(w)
	env := func(k string) string { return os.Getenv(k) }
	var mcps []map[string]interface{}
	base := s.siteAPIBaseURL()
	if u, err := url.Parse(base); err == nil {
		u.Path = strings.TrimRight(u.Path, "/") + "/api/v1/mcps"
		u.RawQuery = r.URL.RawQuery
		req, _ := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
		req.Header.Set("Accept", "application/json")
		client := newSiteAPIHTTPClient(siteAPIDefaultTimeout)
		if res, err := client.Do(req); err == nil && res != nil {
			body, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if res.StatusCode == http.StatusOK {
				_ = json.Unmarshal(body, &mcps)
			}
		}
	}
	if mcps == nil {
		mcps = []map[string]interface{}{}
	}
	snap, _ := handlers.LoadConfigSnapshot(env)
	mcpInstallMap := installmetadata.McpInstallMap(env)
	for i := range mcps {
		if id, ok := mcps[i]["id"]; ok {
			rid := fmt.Sprint(id)
			if serverKey, ok := mcpInstallMap[rid]; ok {
				mcps[i]["installed"] = true
				mcps[i]["serverKey"] = resolveInstalledMcpServerKey(snap, serverKey)
			}
		}
	}
	mcps = appendLocalOnlyMcpsToMarketList(mcps, env)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(mcps)
}

func (s *Server) handleSiteMcpDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.Contains(id, "/") {
		http.NotFound(w, r)
		return
	}
	env := func(k string) string { return os.Getenv(k) }
	if strings.HasPrefix(id, "local:") {
		sk := strings.TrimSpace(strings.TrimPrefix(id, "local:"))
		if sk == "" || strings.Contains(sk, "/") {
			http.NotFound(w, r)
			return
		}
		if serveLocalMcpDetailJSON(w, sk, env) {
			return
		}
		http.NotFound(w, r)
		return
	}
	mcpMap := installmetadata.McpInstallMap(env)
	tryInstalledLocalMcp := func() bool {
		if serverKey, ok := mcpMap[id]; ok {
			return serveLocalMcpDetailJSON(w, serverKey, env)
		}
		return false
	}
	base := s.siteAPIBaseURL()
	u, err := url.Parse(base)
	if err != nil {
		if tryInstalledLocalMcp() {
			return
		}
		http.NotFound(w, r)
		return
	}
	u.Path = strings.TrimRight(u.Path, "/") + "/api/v1/mcps/" + url.PathEscape(id)
	req, _ := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
	req.Header.Set("Accept", "application/json")
	client := newSiteAPIHTTPClient(siteAPIDefaultTimeout)
	res, err := client.Do(req)
	if err != nil {
		if tryInstalledLocalMcp() {
			return
		}
		http.NotFound(w, r)
		return
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	var detail map[string]interface{}
	if res.StatusCode != http.StatusOK || json.Unmarshal(body, &detail) != nil {
		if tryInstalledLocalMcp() {
			return
		}
		http.NotFound(w, r)
		return
	}
	if serverKey, ok := mcpMap[id]; ok {
		detail["installed"] = true
		detail["serverKey"] = serverKey
	}
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(detail)
}

func (s *Server) handleSiteMcpDownload(w http.ResponseWriter, r *http.Request) {
	// /api/v1/mcps/{id}/download
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.Contains(id, "/") {
		http.NotFound(w, r)
		return
	}
	if strings.HasPrefix(id, "local:") {
		setSiteProxyCORSHeaders(w)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "本地 MCP 无需下载",
		})
		return
	}
	s.proxySiteGET(w, r, "/api/v1/mcps/"+url.PathEscape(id)+"/download", proxySiteGETDownload)
}

func (s *Server) handleSiteSkills(w http.ResponseWriter, r *http.Request) {
	// 代理技能列表并合并 .install-metadata.json 中的已安装状态
	setSiteProxyCORSHeaders(w)
	env := func(k string) string { return os.Getenv(k) }
	var skills []map[string]interface{}
	base := s.siteAPIBaseURL()
	if u, err := url.Parse(base); err == nil {
		u.Path = strings.TrimRight(u.Path, "/") + "/api/v1/skills"
		u.RawQuery = r.URL.RawQuery
		req, _ := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
		req.Header.Set("Accept", "application/json")
		client := newSiteAPIHTTPClient(siteAPIDefaultTimeout)
		if res, err := client.Do(req); err == nil && res != nil {
			body, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if res.StatusCode == http.StatusOK {
				_ = json.Unmarshal(body, &skills)
			}
		}
	}
	if skills == nil {
		skills = []map[string]interface{}{}
	}
	skills = mergeSkillsListWithLocalManaged(skills, env)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(skills)
}

func (s *Server) handleSiteSkillDetail(w http.ResponseWriter, r *http.Request) {
	folder := strings.TrimSpace(r.PathValue("folder"))
	if folder == "" || strings.Contains(folder, "/") {
		http.NotFound(w, r)
		return
	}
	env := func(k string) string { return os.Getenv(k) }
	managedDir := handlers.ResolveManagedSkillsDir(env)
	base := s.siteAPIBaseURL()
	u, err := url.Parse(base)
	if err != nil {
		if tryWriteLocalSkillDetail(w, managedDir, folder) {
			return
		}
		http.NotFound(w, r)
		return
	}
	u.Path = strings.TrimRight(u.Path, "/") + "/api/v1/skills/" + url.PathEscape(folder)
	req, _ := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
	req.Header.Set("Accept", "application/json")
	client := newSiteAPIHTTPClient(siteAPIDefaultTimeout)
	res, err := client.Do(req)
	if err != nil {
		if tryWriteLocalSkillDetail(w, managedDir, folder) {
			return
		}
		http.NotFound(w, r)
		return
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode == http.StatusNotFound {
		if tryWriteLocalSkillDetail(w, managedDir, folder) {
			return
		}
		http.NotFound(w, r)
		return
	}
	var detail map[string]interface{}
	if res.StatusCode != http.StatusOK || json.Unmarshal(body, &detail) != nil {
		if tryWriteLocalSkillDetail(w, managedDir, folder) {
			return
		}
		http.NotFound(w, r)
		return
	}
	skillSet := installmetadata.SkillInstallSet(env)
	if _, ok := skillSet[folder]; ok {
		detail["installed"] = true
	} else if _, err := os.Stat(filepath.Join(managedDir, folder, "SKILL.md")); err == nil {
		detail["installed"] = true
	}
	setSiteProxyCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(detail)
}

func (s *Server) handleSiteSkillDownload(w http.ResponseWriter, r *http.Request) {
	// /api/v1/skills/{folder}/download
	folder := strings.TrimSpace(r.PathValue("folder"))
	if folder == "" || strings.Contains(folder, "/") {
		http.NotFound(w, r)
		return
	}
	s.proxySiteGET(w, r, "/api/v1/skills/"+url.PathEscape(folder)+"/download", proxySiteGETDownload)
}

func (s *Server) handleSiteCategories(w http.ResponseWriter, r *http.Request) {
	s.proxySiteGET(w, r, "/api/v1/categories", proxySiteGETSilentJSONArray)
}

func (s *Server) handleSiteEduCategories(w http.ResponseWriter, r *http.Request) {
	s.proxySiteGET(w, r, "/api/v1/edu/categories", proxySiteGETSilentJSONArray)
}

func (s *Server) handleSiteEduLessonDetail(w http.ResponseWriter, r *http.Request) {
	// /api/v1/edu/lessons/{id}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.Contains(id, "/") {
		http.NotFound(w, r)
		return
	}
	s.proxySiteGET(w, r, "/api/v1/edu/lessons/"+url.PathEscape(id), proxySiteGETSilentJSONObject)
}

// handleSiteUploads 代理官网的静态资源（如 logo），将 /api/v1/site/uploads/{path...} 转发到 {base}/uploads/{path}
func (s *Server) handleSiteUploads(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSpace(r.PathValue("path"))
	if path == "" || strings.Contains(path, "..") {
		http.NotFound(w, r)
		return
	}
	s.proxySiteGET(w, r, "/uploads/"+path, proxySiteGETNotFound)
}
