package runtime

import (
	"context"
	"fmt"
	"strings"

	octasecurity "github.com/openocta/openocta/pkg/security"
	"github.com/stellarlinkco/agentsdk-go/pkg/middleware"
	"github.com/stellarlinkco/agentsdk-go/pkg/model"
)

func formatApprovalCommand(toolName, target string) string {
	name := strings.TrimSpace(toolName)
	if name == "" {
		name = "tool"
	}
	target = strings.TrimSpace(target)
	if target == "" {
		return name
	}
	return fmt.Sprintf("%s(%s)", name, target)
}

type approvalQueueOptions struct {
	Queue                *octasecurity.ApprovalQueue
	BlockWait            bool
	CommandPolicy        *ResolvedCommandPolicy
	AutoAllowSandboxBash bool
}

func shouldBlockForApproval(opts approvalQueueOptions, command string) bool {
	cmd := strings.TrimSpace(command)
	if cmd == "" {
		return false
	}
	policy := opts.CommandPolicy
	if policy == nil || !policy.Enabled {
		return false
	}
	segments := splitShellCommandSegments(cmd)
	if len(segments) == 0 {
		return false
	}
	for _, segment := range segments {
		action, explicit := policy.evaluateSingleCommandAccess(segment)
		switch action {
		case "deny":
			return false
		case "allow":
			continue
		case "ask":
			if isAutoAllowShellSegment(segment) {
				continue
			}
			if explicit {
				return true
			}
			if !opts.AutoAllowSandboxBash {
				return true
			}
		default:
			if isAutoAllowShellSegment(segment) {
				continue
			}
			if !opts.AutoAllowSandboxBash {
				return true
			}
		}
	}
	return false
}

// approvalQueueMiddleware blocks bash execution until the OpenOcta approval queue allows it
// when command policy requires human review (agentsdk-go v2 移除了内置 PermissionResolver / ApprovalQueue 挂载点).
func approvalQueueMiddleware(opts approvalQueueOptions) middleware.Middleware {
	q := opts.Queue
	blockWait := opts.BlockWait
	return middleware.Funcs{
		Identifier: "openocta-approval-queue",
		OnBeforeTool: func(ctx context.Context, st *middleware.State) error {
			if q == nil || st == nil {
				return nil
			}
			call, ok := st.ToolCall.(model.ToolCall)
			if !ok {
				return nil
			}
			if !strings.EqualFold(strings.TrimSpace(call.Name), "bash") && !strings.EqualFold(strings.TrimSpace(call.Name), "windows_exec_cmd") {
				return nil
			}
			cmd, _ := call.Arguments["command"].(string)
			if strings.TrimSpace(cmd) == "" {
				return nil
			}
			if !shouldBlockForApproval(opts, cmd) {
				return nil
			}
			sid, _ := st.Values["session_id"].(string)
			if strings.TrimSpace(sid) == "" {
				return fmt.Errorf("openocta: approval queue requires session_id")
			}
			line := formatApprovalCommand("Bash", strings.TrimSpace(cmd))
			rec, err := q.Request(sid, line, nil)
			if err != nil {
				return err
			}
			if rec.State == octasecurity.ApprovalApproved {
				return nil
			}
			if !blockWait {
				return fmt.Errorf("bash approval required (requestId=%s): ask the user to reply 确认 or 取消 in the chat input box; do not use A2UI Button components", rec.ID)
			}
			resolved, err := q.Wait(ctx, rec.ID)
			if err != nil {
				return err
			}
			switch resolved.State {
			case octasecurity.ApprovalApproved:
				return nil
			case octasecurity.ApprovalDenied:
				reason := strings.TrimSpace(resolved.Reason)
				if reason == "" {
					reason = "denied"
				}
				return fmt.Errorf("bash execution denied: %s", reason)
			default:
				return fmt.Errorf("bash approval left pending")
			}
		},
	}
}
