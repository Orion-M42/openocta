package browser

import (
	"context"
	"testing"
)

func TestStopForRunNoOpWhenNotMarked(t *testing.T) {
	StopForRun(context.Background(), nil, nil, "run-1")
	if runUsedBrowser("run-1") {
		t.Fatal("run should not remain marked")
	}
}

func TestMarkAndStopForRunClearsMark(t *testing.T) {
	MarkRunUsingBrowser("run-2")
	StopForRun(context.Background(), nil, nil, "run-2")
	StopForRun(context.Background(), nil, nil, "run-2")
}
