//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"log"

	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

func main() {
	config := core.LoadConfig()
	db.InitDB(config)

	var user models.User
	if err := db.DB.First(&user, 1).Error; err != nil {
		log.Fatalf("User ID 1 not found: %v", err)
	}

	// 1. Assign Roles
	roles := []string{"admin", "pharmacist", "gomla", "reviewer", "preparation", "control", "distribution"}
	for _, roleName := range roles {
		var role models.Role
		if err := db.DB.Where("name = ?", roleName).FirstOrCreate(&role, models.Role{Name: roleName}).Error; err != nil {
			log.Printf("Failed to create role %s: %v", roleName, err)
		} else {
			db.DB.Model(&user).Association("Roles").Append(&role)
		}
	}
	fmt.Println("Assigned all roles to User 1.")

	// 2. Create Pharmacy (assuming code 1 was the old pharmacy)
	var pharmacy models.Pharmacy
	if err := db.DB.Where("code = ?", "1").FirstOrCreate(&pharmacy, models.Pharmacy{
		Name:    "صيدلية د. أحمد (تجريبي)",
		Code:    "1",
		Phone:   "01000000000",
		Address: "المركز الرئيسي",
	}).Error; err != nil {
		log.Printf("Failed to create pharmacy: %v", err)
	} else {
		db.DB.Model(&user).Association("Pharmacies").Append(&pharmacy)
		fmt.Println("Linked User 1 to Pharmacy Code 1.")
	}

	// Also link a generic gomla pharmacy for testing
	var gomla models.Pharmacy
	if err := db.DB.Where("code = ?", "1001").FirstOrCreate(&gomla, models.Pharmacy{
		Name:    "عميل جملة (تجريبي)",
		Code:    "1001",
		Phone:   "01111111111",
		Address: "فرع الجملة",
	}).Error; err != nil {
		log.Printf("Failed to create gomla pharmacy: %v", err)
	} else {
		db.DB.Model(&user).Association("Pharmacies").Append(&gomla)
		fmt.Println("Linked User 1 to Gomla Pharmacy Code 1001.")
	}

	fmt.Println("Database fix complete!")
}

