package browser

import (
	"context"
	"os"

	"github.com/openocta/openocta/pkg/config"
	"github.com/openocta/openocta/pkg/paths"
)

// PreviewOptions controls GET /api/browser/preview.
type PreviewOptions struct {
	TargetID          string
	IncludeScreenshot bool
}

// PreviewState aggregates browser status for remote UI preview.
func PreviewState(ctx context.Context, cfg *config.OpenOctaConfig, env func(string) string, opts PreviewOptions) (map[string]interface{}, error) {
	if env == nil {
		env = os.Getenv
	}
	svc := DefaultService(cfg, env)
	status, err := svc.status(ctx)
	if err != nil {
		return nil, err
	}
	runMode := paths.ResolveRunMode(env, gatewayMode(cfg))
	out := map[string]interface{}{
		"ok":             true,
		"runMode":        runMode,
		"previewEnabled": runMode != "desktop",
		"running":        status["running"],
		"chromiumReady":  status["chromiumReady"],
		"tabCount":       status["tabCount"],
	}
	if errMsg, ok := status["chromiumError"].(string); ok && errMsg != "" {
		out["chromiumError"] = errMsg
	}
	running, _ := status["running"].(bool)
	if !running {
		return out, nil
	}
	params := map[string]interface{}{}
	if opts.TargetID != "" {
		params["targetId"] = opts.TargetID
	}
	snap, err := svc.snapshot(ctx, params)
	if err == nil {
		out["targetId"] = snap["targetId"]
		out["suggestedTargetId"] = snap["suggestedTargetId"]
		out["url"] = snap["url"]
		out["title"] = snap["title"]
		out["snapshot"] = snap["snapshot"]
		out["text"] = snap["text"]
		out["refCount"] = snap["refCount"]
	}
	if opts.IncludeScreenshot {
		shot, err := svc.screenshot(ctx, params)
		if err == nil {
			out["screenshotBase64"] = shot["base64"]
			out["screenshotFormat"] = shot["format"]
		} else {
			out["screenshotError"] = err.Error()
		}
	}
	tabs, err := svc.listTabs(ctx)
	if err == nil {
		out["tabs"] = tabs["tabs"]
	}
	return out, nil
}

func gatewayMode(cfg *config.OpenOctaConfig) *string {
	if cfg == nil || cfg.Gateway == nil {
		return nil
	}
	return cfg.Gateway.Mode
}
