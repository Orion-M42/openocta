package http

import "net/http"

func (s *Server) handleDesktopBrowserOptions(w http.ResponseWriter, r *http.Request) {
	s.handleBrowserOptions(w, r)
}
