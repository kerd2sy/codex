//go:build ignore
// +build ignore

package main

import (
	"log"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

func main() {
	cfg := core.LoadConfig()

	db.InitDB(cfg)

	migrator := db.DB.Migrator()

	// Drop old columns from users table
	colsToDrop := []string{"can_create_invoice", "can_access_gomla", "otp_code", "role", "can_access_admin", "can_access_reviewer"}
	for _, col := range colsToDrop {
		if migrator.HasColumn(&models.User{}, col) {
			if err := migrator.DropColumn(&models.User{}, col); err != nil {
				log.Printf("Failed to drop column %s: %v\n", col, err)
			} else {
				log.Printf("Successfully dropped column %s\n", col)
			}
		}
	}
	
	// Drop unused tables
	tablesToDrop := []string{"user_payment_methods", "devices"}
	for _, t := range tablesToDrop {
		if migrator.HasTable(t) {
			if err := migrator.DropTable(t); err != nil {
				log.Printf("Failed to drop %s table: %v\n", t, err)
			} else {
				log.Printf("Successfully dropped %s table\n", t)
			}
		}
	}

	log.Println("Done.")
}

