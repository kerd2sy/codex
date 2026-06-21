//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	db.InitDB(core.LoadConfig())

	var admins []models.User
	db.DB.Joins("JOIN user_roles ON user_roles.user_id = users.id").
		Joins("JOIN roles ON roles.id = user_roles.role_id").
		Where("roles.name IN ?", []string{"admin", "manager"}).
		Find(&admins)

	fmt.Printf("Found %d admins\n", len(admins))
	for _, a := range admins {
		fmt.Printf("- %s (ID: %d)\n", a.Username, a.ID)
	}

	var notifs []models.Notification; db.DB.Order("created_at desc").Limit(5).Find(&notifs); for _, n := range notifs { fmt.Printf("Notif: %s - %s\n", n.Title, n.Description) }; var allRoles []models.Role
	db.DB.Find(&allRoles)
	fmt.Printf("All Roles:\n")
	for _, r := range allRoles {
		fmt.Printf("- %s\n", r.Name)
	}
}
