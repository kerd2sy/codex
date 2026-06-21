//go:build ignore
// +build ignore

package main

import (
	"log"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
)

func main() {
	cfg := core.LoadConfig()

	db.InitDB(cfg)

	log.Println("WARNING: Wiping out the entire Supabase public schema...")

	// Drop schema and recreate it
	err := db.DB.Exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;").Error
	if err != nil {
		log.Fatalf("Failed to wipe database: %v", err)
	}

	log.Println("✅ Database successfully wiped! All data and tables have been deleted.")
	log.Println("Restart your backend server to automatically recreate the tables (AutoMigrate).")
}

