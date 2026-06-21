package main

import (
	"fmt"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
    "tabarak-pharma-backend/internal/core"
)

func main() {
    config := core.LoadConfig()
	db.InitDB(config)

	var notes []models.Notification
	if err := db.DB.Order("id desc").Limit(5).Find(&notes).Error; err != nil {
		fmt.Println("Error:", err)
		return
	}

	for _, n := range notes {
        var user models.User
        db.DB.First(&user, *n.UserID)
		fmt.Printf("Note %d: %s (Type: %s) -> User %d (%s) Expo: '%s', FCM: '%s'\n", n.ID, n.Title, n.Type, user.ID, user.Email, user.ExpoPushToken, user.FCMToken)
	}
}
