package repositories

import (
	"tabarak-pharma-backend/internal/models"
	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) GetUserNotifications(userID uint) ([]models.Notification, error) {
	var notifications []models.Notification
	// Fetch both personal and broadcast notifications
	err := r.db.Where("(user_id = ? OR user_id IS NULL) AND is_dismissed = ?", userID, false).
		Order("created_at DESC").
		Find(&notifications).Error
	return notifications, err
}

func (r *NotificationRepository) GetBroadcasts() ([]models.Notification, error) {
	var notifications []models.Notification
	err := r.db.Where("user_id IS NULL").Find(&notifications).Error
	return notifications, err
}

func (r *NotificationRepository) GetUnreadCount(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Notification{}).
		Where("(user_id = ? OR user_id IS NULL) AND unread = ? AND is_dismissed = ?", userID, true, false).
		Count(&count).Error
	return count, err
}

func (r *NotificationRepository) MarkAsRead(userID uint, notificationID uint) error {
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND (user_id = ? OR user_id IS NULL)", notificationID, userID).
		Update("unread", false).Error
}

func (r *NotificationRepository) Dismiss(userID uint, notificationID uint) error {
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND (user_id = ? OR user_id IS NULL)", notificationID, userID).
		Update("is_dismissed", true).Error
}

func (r *NotificationRepository) ClearAll(userID uint) error {
	return r.db.Model(&models.Notification{}).
		Where("user_id = ? OR user_id IS NULL", userID).
		Update("is_dismissed", true).Error
}

func (r *NotificationRepository) UpdatePushTokens(userID uint, fcmToken, expoToken string) error {
	updates := make(map[string]interface{})
	if fcmToken != "" {
		updates["fcm_token"] = fcmToken
	}
	if expoToken != "" {
		updates["expo_push_token"] = expoToken
	}
	if len(updates) == 0 {
		return nil
	}
	return r.db.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error
}
