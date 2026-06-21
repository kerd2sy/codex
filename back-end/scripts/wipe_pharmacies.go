//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"log"

	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
)

func main() {
	config := core.LoadConfig()
	db.InitDB(config)

	if err := db.DB.Exec("TRUNCATE TABLE user_pharmacies CASCADE;").Error; err != nil {
		log.Printf("Failed to truncate user_pharmacies: %v", err)
	}

	if err := db.DB.Exec("TRUNCATE TABLE pharmacies CASCADE;").Error; err != nil {
		log.Printf("Failed to truncate pharmacies: %v", err)
	}

	fmt.Println("Successfully deleted all pharmacies and links!")
}

