package db

import (
	"fmt"
	"log"
	"os"
	"time"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(config *core.Config) {
	var err error
	dsn := config.PostgresDatabaseURI
	if dsn == "" {
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
			config.DBHost, config.DBUser, config.DBPass, config.DBName, config.DBPort)
	}

	// Configure GORM Logger with a higher threshold for Slow SQL (since DB is remote)
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold: 1 * time.Second, // 1 second threshold
			LogLevel:      logger.Warn,
			Colorful:      true,
		},
	)
	
	// Disable Prepared Statements for Supabase Transaction Pooler compatibility
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		PrepareStmt: false,
		Logger:      newLogger,
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Configure pool
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(25) // Increased for better concurrency
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	log.Println("Database connection established")

	// Auto-migrate models
	err = DB.AutoMigrate(
		&models.Role{},
		&models.User{},
		&models.Pharmacy{},
		&models.Notification{},
		&models.LoginActivity{},
		&models.GoogleUser{},
		&models.ProductSearchHistory{},
		&models.ProductBatchHistory{},
		&models.InvoiceAuditRecord{},
		&models.ItemAuditRecord{},
		&models.Employee{},
		&models.EmployeeMonthlyRecord{},
		&models.EmployeeAttendance{},
		&models.EmployeeLoan{},
	)
	if err != nil {
		log.Println("Auto-migration failed:", err)
	} else {
		log.Println("Database migration completed")
	}
}
