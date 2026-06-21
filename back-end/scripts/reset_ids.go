//go:build ignore
// +build ignore

package main

import (
	"log"
	"tabarak-pharma-backend/internal/core"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"tabarak-pharma-backend/internal/models"
	"time"
)

func main() {
	cfg := core.LoadConfig()

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

	log.Println("WARNING: Truncating all tables and restarting IDs from 1...")

	// Truncate all tables and RESTART IDENTITY
	truncateQuery := `
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
    END LOOP;
END $$;
`
	if err := db.Exec(truncateQuery).Error; err != nil {
		log.Fatalf("Failed to truncate and restart IDs: %v", err)
	}

	log.Println("✅ All IDs restarted from 1 successfully!")
	
	// Reseed roles since they were deleted by truncate
	roles := []models.Role{
		{Name: "admin", Description: "مدير النظام - وصول كامل لكل الشاشات والتقارير"},
		{Name: "pharmacist", Description: "صيدلي - للعمل على شاشة الكاشير والمبيعات والصيدلية"},
		{Name: "employee", Description: "موظف داخلي - لتسجيل الحضور والانصراف والمهام"},
		{Name: "gomla", Description: "مسؤول الجملة - لتحضير الطلبيات وتعديل الفواتير"},
	}

	for _, role := range roles {
		if err := db.Where(models.Role{Name: role.Name}).FirstOrCreate(&role).Error; err != nil {
			log.Printf("Failed to insert role %s: %v\n", role.Name, err)
		} else {
			log.Printf("Role %s added successfully.\n", role.Name)
		}
	}

	log.Println("✅ Roles seeded successfully!")
}

