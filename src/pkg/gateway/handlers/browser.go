package handlers

import (
	"context"
	"os"

	"github.com/openocta/openocta/pkg/browser"
	"github.com/openocta/openocta/pkg/config"
	"github.com/openocta/openocta/pkg/gateway/protocol"
)

// BrowserRequestHandler handles "browser.request" for bundled Chromium control.
func BrowserRequestHandler(opts HandlerOpts) error {
	if opts.Context != nil && opts.Context.Config != nil {
		if opts.Context.Config.Browser != nil && opts.Context.Config.Browser.Enabled != nil && !*opts.Context.Config.Browser.Enabled {
			opts.Respond(false, nil, &protocol.ErrorShape{
				Code:    protocol.ErrCodeInvalidRequest,
				Message: "browser is disabled in config (browser.enabled=false)",
			}, nil)
			return nil
		}
	}
	var cfg *config.OpenOctaConfig
	if opts.Context != nil {
		cfg = opts.Context.Config
	}
	payload, err := browser.HandleRequest(context.Background(), cfg, os.Getenv, opts.Params)
	if err != nil {
		opts.Respond(false, nil, &protocol.ErrorShape{
			Code:    protocol.ErrCodeInvalidRequest,
			Message: err.Error(),
		}, nil)
		return nil
	}
	opts.Respond(true, payload, nil, nil)
	return nil
}
