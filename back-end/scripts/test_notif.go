//go:build ignore
// +build ignore

package main

import (
	"log"

	"github.com/joho/godotenv"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	db.InitDB(core.LoadConfig())
}
