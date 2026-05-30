package notifications

import (
	"log"
	"time"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

func StartNotificationWorker(service *NotificationService) {
	log.Println("[Worker] Notification sync worker started")
	
	// Run every 2 minutes
	ticker := time.NewTicker(2 * time.Minute)
	
	go func() {
		for range ticker.C {
			log.Println("[Worker] Starting periodic notification sync for all users...")
			syncAllUsers(service)
		}
	}()
}

func syncAllUsers(service *NotificationService) {
	var users []models.User
	// Only sync users who have a push token and pharmacies linked
	err := db.DB.Preload("Pharmacies").
		Where("expo_push_token != '' OR fcm_token != ''").
		Find(&users).Error
	
	if err != nil {
		log.Printf("[Worker] Failed to fetch users for sync: %v", err)
		return
	}

	for _, user := range users {
		if len(user.Pharmacies) > 0 {
			// SyncNotifications will find new records and send push
			service.SyncNotifications(&user)
		}
	}
	log.Printf("[Worker] Finished periodic sync for %d users", len(users))
}
