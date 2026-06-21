//go:build ignore
// +build ignore

package main

import (
	"encoding/json"
	"fmt"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

func main() {
	cfg := core.LoadConfig()
	db.InitDB(cfg)

	var users []models.User
	db.DB.Preload("Roles").Preload("Employee").Where("email IN ?", []string{"test@test.com", "test2@test.com"}).Find(&users)

	for _, u := range users {
		b, _ := json.MarshalIndent(u, "", "  ")
		fmt.Println(string(b))
	}
}

