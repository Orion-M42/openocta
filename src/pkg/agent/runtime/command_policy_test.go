package runtime

import "testing"

func TestEvaluateCommandAccessCompoundCommand(t *testing.T) {
	policy := &ResolvedCommandPolicy{
		Enabled:       true,
		DefaultPolicy: "ask",
		AllowRules:    []CommandRule{{Pattern: "ls", Type: "command"}},
		AskRules:      []CommandRule{{Pattern: "rm", Type: "command"}},
	}

	action, explicit := policy.EvaluateCommandAccess("hostname && uname -a")
	if action != "ask" || explicit {
		t.Fatalf("expected default ask without explicit rule, got action=%q explicit=%v", action, explicit)
	}

	action, explicit = policy.EvaluateCommandAccess("ls -la && pwd")
	if action != "ask" || explicit {
		t.Fatalf("expected default ask when a segment is not allow-listed, got action=%q explicit=%v", action, explicit)
	}
	if shouldBlockForApproval(approvalQueueOptions{CommandPolicy: policy, AutoAllowSandboxBash: true}, "ls -la && pwd") {
		t.Fatal("sandbox auto-allow should skip approval when only default-ask segments remain")
	}

	action, explicit = policy.EvaluateCommandAccess("rm foo")
	if action != "ask" || !explicit {
		t.Fatalf("expected explicit ask for rm, got action=%q explicit=%v", action, explicit)
	}
}

func TestShouldBlockForApprovalSandboxAutoAllow(t *testing.T) {
	policy := &ResolvedCommandPolicy{
		Enabled:       true,
		DefaultPolicy: "ask",
		AskRules:      []CommandRule{{Pattern: "rm", Type: "command"}},
	}
	opts := approvalQueueOptions{
		CommandPolicy:        policy,
		AutoAllowSandboxBash: true,
	}
	if shouldBlockForApproval(opts, "hostname && uname -a") {
		t.Fatal("sandbox auto-allow should skip approval for default-ask diagnostics")
	}
	if !shouldBlockForApproval(opts, "rm -rf tmp") {
		t.Fatal("explicit ask rules should still require approval")
	}
}

func TestShouldBlockForApprovalReadOnlyCompound(t *testing.T) {
	policy := &ResolvedCommandPolicy{
		Enabled:       true,
		DefaultPolicy: "ask",
		AllowRules:    []CommandRule{{Pattern: "ls", Type: "command"}},
	}
	opts := approvalQueueOptions{CommandPolicy: policy, AutoAllowSandboxBash: false}
	cmd := `ls -la attachments/inspection_report.html attachments/report.html 2>/dev/null && echo "---" && wc -l attachments/inspection_report.html attachments/report.html 2>/dev/null`
	if shouldBlockForApproval(opts, cmd) {
		t.Fatal("read-only compound ls/wc should not require approval even without sandbox auto-allow")
	}
}

func TestShouldBlockForApprovalBenignWrite(t *testing.T) {
	policy := &ResolvedCommandPolicy{
		Enabled:       true,
		DefaultPolicy: "ask",
	}
	opts := approvalQueueOptions{CommandPolicy: policy, AutoAllowSandboxBash: false}
	cmd := "mkdir -p /Users/zhanbei/.openocta/workspace/inspection-report"
	if shouldBlockForApproval(opts, cmd) {
		t.Fatal("mkdir -p should not require approval")
	}
	if shouldBlockForApproval(opts, "touch foo && ls foo") {
		t.Fatal("touch segment should auto-allow in compound command")
	}
	if shouldBlockForApproval(opts, "rm -rf foo") {
		// rm is not benign; should still block
	} else {
		t.Fatal("rm should still require approval")
	}
}
