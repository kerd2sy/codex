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

	roles := []models.Role{
		{Name: "admin", Description: "مدير النظام - وصول كامل لكل الشاشات والتقارير"},
		{Name: "pharmacist", Description: "صيدلي - للعمل على شاشة الكاشير والمبيعات والصيدلية"},
		{Name: "employee", Description: "موظف داخلي - لتسجيل الحضور والانصراف والمهام"},
	}

	for _, role := range roles {
		// Create or skip if already exists
		if err := db.DB.Where(models.Role{Name: role.Name}).FirstOrCreate(&role).Error; err != nil {
			log.Printf("Failed to insert role %s: %v\n", role.Name, err)
		} else {
			log.Printf("Role %s added successfully.\n", role.Name)
		}
	}

	log.Println("✅ Roles seeded successfully!")
}

