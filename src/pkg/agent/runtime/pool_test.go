package runtime

import (
	"sync/atomic"
	"testing"
)

func TestPoolReusesRuntimeForSameFingerprint(t *testing.T) {
	pool := NewPool()
	var builds atomic.Int32

	rt1, release1, err := pool.Acquire("sess-a", "fp1", func() (*Runtime, func(), error) {
		builds.Add(1)
		return &Runtime{}, func() {}, nil
	})
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	release1()

	rt2, release2, err := pool.Acquire("sess-a", "fp1", func() (*Runtime, func(), error) {
		builds.Add(1)
		return &Runtime{}, func() {}, nil
	})
	if err != nil {
		t.Fatalf("re-acquire: %v", err)
	}
	defer release2()

	if builds.Load() != 1 {
		t.Fatalf("expected one build, got %d", builds.Load())
	}
	if rt1 != rt2 {
		t.Fatalf("expected same runtime pointer")
	}
}

func TestPoolEvictForcesRebuild(t *testing.T) {
	pool := NewPool()
	var builds atomic.Int32

	_, release, err := pool.Acquire("sess-b", "fp1", func() (*Runtime, func(), error) {
		builds.Add(1)
		return &Runtime{}, func() {}, nil
	})
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	release()

	pool.Evict("sess-b")

	_, release2, err := pool.Acquire("sess-b", "fp1", func() (*Runtime, func(), error) {
		builds.Add(1)
		return &Runtime{}, func() {}, nil
	})
	if err != nil {
		t.Fatalf("re-acquire: %v", err)
	}
	release2()

	if builds.Load() != 2 {
		t.Fatalf("expected two builds after evict, got %d", builds.Load())
	}
}
