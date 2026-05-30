package main

import (
	"log"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

func main() {
	config := core.LoadConfig()
	db.InitDB(config)

	testNote := models.Notification{
		Title:       "تم تفعيل النظام الجديد بنجاح",
		Description: "أهلاً بك في نظام تبارك فارما المطور. تم تفعيل نظام الإشعارات وتحديث الرصيد اللحظي.",
		Icon:        "notifications-outline",
		Color:       "#4CAF50",
		Unread:      true,
		UserID:      &[]uint{35}[0], // User ID 35
		Type:        "system_update",
	}

	if err := db.DB.Create(&testNote).Error; err != nil {
		log.Fatal(err)
	}
	log.Println("Test notification created successfully for user 35")
}
