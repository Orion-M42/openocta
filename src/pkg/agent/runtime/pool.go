package runtime

import (
	"sync"
	"time"
)

// Pool reuses agent Runtime instances (and associated MCP connections) per session
// to avoid cold-start cost on every chat message.
type Pool struct {
	mu      sync.Mutex
	entries map[string]*poolEntry
}

type poolEntry struct {
	rt          *Runtime
	onEvict     func()
	fingerprint string
	lastUsed    time.Time
	mu          sync.Mutex
}

var defaultPool = NewPool()

// NewPool creates an empty runtime pool.
func NewPool() *Pool {
	return &Pool{entries: make(map[string]*poolEntry)}
}

// DefaultPool returns the process-wide chat runtime pool.
func DefaultPool() *Pool {
	return defaultPool
}

// EvictSessionRuntime closes and removes the pooled runtime for sessionKey (/new, session delete).
func EvictSessionRuntime(sessionKey string) {
	defaultPool.Evict(sessionKey)
}

// Acquire returns a pooled Runtime for sessionKey when fingerprint matches; otherwise it
// builds a new one via build. release must be called when the run finishes (unlocks the entry).
func (p *Pool) Acquire(sessionKey, fingerprint string, build func() (*Runtime, func(), error)) (*Runtime, func(), error) {
	if p == nil {
		rt, onEvict, err := build()
		if err != nil {
			return nil, nil, err
		}
		return rt, func() {
			if onEvict != nil {
				onEvict()
			}
			if rt != nil {
				rt.Close()
			}
		}, nil
	}

	p.mu.Lock()
	ent, ok := p.entries[sessionKey]
	if ok && ent.fingerprint != fingerprint {
		ent.close()
		delete(p.entries, sessionKey)
		ok = false
	}
	if !ok {
		rt, onEvict, err := build()
		if err != nil {
			p.mu.Unlock()
			return nil, nil, err
		}
		ent = &poolEntry{rt: rt, onEvict: onEvict, fingerprint: fingerprint}
		p.entries[sessionKey] = ent
	}
	p.mu.Unlock()

	ent.mu.Lock()
	return ent.rt, func() {
		ent.lastUsed = time.Now()
		ent.mu.Unlock()
	}, nil
}

// Evict closes and removes the entry for sessionKey.
func (p *Pool) Evict(sessionKey string) {
	if p == nil {
		return
	}
	p.mu.Lock()
	ent := p.entries[sessionKey]
	delete(p.entries, sessionKey)
	p.mu.Unlock()
	if ent != nil {
		ent.close()
	}
}

// EvictAll closes and removes every pooled runtime (e.g. after knowledge index rebuild).
func (p *Pool) EvictAll() {
	if p == nil {
		return
	}
	p.mu.Lock()
	entries := make([]*poolEntry, 0, len(p.entries))
	for _, ent := range p.entries {
		if ent != nil {
			entries = append(entries, ent)
		}
	}
	p.entries = make(map[string]*poolEntry)
	p.mu.Unlock()
	for _, ent := range entries {
		ent.close()
	}
}

// EvictAllSessionRuntimes evicts all pooled chat runtimes in this process.
func EvictAllSessionRuntimes() {
	defaultPool.EvictAll()
}

func (e *poolEntry) close() {
	if e == nil {
		return
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.onEvict != nil {
		e.onEvict()
		e.onEvict = nil
	}
	if e.rt != nil {
		e.rt.Close()
		e.rt = nil
	}
}
