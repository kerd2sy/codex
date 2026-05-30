package auth

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
)

type ExchangeEntry struct {
	TokenResponse *TokenResponse
	Expiry        time.Time
}

type TokenExchangeStore struct {
	localStore map[string]ExchangeEntry
	mu         sync.Mutex
}

var GlobalExchangeStore = &TokenExchangeStore{
	localStore: make(map[string]ExchangeEntry),
}

func (s *TokenExchangeStore) Save(tokens *TokenResponse, duration time.Duration) string {
	code := uuid.New().String()
	s.mu.Lock()
	defer s.mu.Unlock()

	s.localStore[code] = ExchangeEntry{
		TokenResponse: tokens,
		Expiry:        time.Now().Add(duration),
	}

	// Basic cleanup on save to prevent memory leaks
	go s.cleanup()

	return code
}

func (s *TokenExchangeStore) Pop(code string) (*TokenResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.localStore[code]
	if !ok {
		return nil, errors.New("code not found")
	}

	delete(s.localStore, code)

	if time.Now().After(entry.Expiry) {
		return nil, errors.New("code expired")
	}

	return entry.TokenResponse, nil
}

func (s *TokenExchangeStore) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for code, entry := range s.localStore {
		if time.Now().After(entry.Expiry) {
			delete(s.localStore, code)
		}
	}
}
