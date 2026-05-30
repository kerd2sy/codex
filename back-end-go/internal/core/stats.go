package core

import (
	"runtime"
	"time"
)

var StartTime time.Time

func init() {
	StartTime = time.Now()
}

type Stats struct {
	Uptime       string `json:"uptime"`
	GoRoutines   int    `json:"go_routines"`
	MemoryAlloc  uint64 `json:"memory_alloc"`
	MemoryTotal  uint64 `json:"memory_total"`
	MemorySys    uint64 `json:"memory_sys"`
	NumGC        uint32 `json:"num_gc"`
	GoVersion    string `json:"go_version"`
}

func GetStats() Stats {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return Stats{
		Uptime:       time.Since(StartTime).String(),
		GoRoutines:   runtime.NumGoroutine(),
		MemoryAlloc:  m.Alloc / 1024 / 1024,
		MemoryTotal:  m.TotalAlloc / 1024 / 1024,
		MemorySys:    m.Sys / 1024 / 1024,
		NumGC:        m.NumGC,
		GoVersion:    runtime.Version(),
	}
}
