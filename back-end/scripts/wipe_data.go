//go:build ignore
// +build ignore

package main

import (
	"log"
	"tabarak-pharma-backend/internal/core"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"time"
)

func main() {
	cfg := core.LoadConfig()

	// Connect to DB directly without AutoMigrate
	dsn := cfg.PostgresDatabaseURI
	
	newLogger := logger.New(
		log.New(log.Writer(), "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold: 1 * time.Second,
			LogLevel:      logger.Warn,
			Colorful:      true,
		},
	)
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		PrepareStmt: false,
		Logger:      newLogger,
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("WARNING: Truncating all tables in the public schema...")

	// Truncate all tables
	truncateQuery := `
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
`
	if err := db.Exec(truncateQuery).Error; err != nil {
		log.Fatalf("Failed to truncate database: %v", err)
	}

	log.Println("✅ All data successfully deleted! The tables remain empty.")
}

