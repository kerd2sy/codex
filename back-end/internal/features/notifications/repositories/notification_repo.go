package repositories

import (
	"time"
	"tabarak-pharma-backend/internal/models"
	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) GetUserNotifications(userID uint, app string) ([]models.Notification, error) {
	var notifications []models.Notification
	query := r.db.Where("(user_id = ? OR user_id IS NULL) AND is_dismissed = ?", userID, false)
	
	if app == "pharmacy" {
		query = query.Where("type != ?", "system")
	} else if app == "admin" || app == "gomla" {
		// Admin/gomla should see their own stuff and system notifications.
		// If they shouldn't see pharmacy stuff, we could limit to "system" only:
		// query = query.Where("type = ?", "system")
		// But usually admins want to see everything.
	}

	err := query.Order("created_at DESC").Limit(100).Find(&notifications).Error
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

func (r *NotificationRepository) MarkAllAsRead(userID uint) error {
	return r.db.Model(&models.Notification{}).
		Where("(user_id = ? OR user_id IS NULL) AND unread = ?", userID, true).
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

func (r *NotificationRepository) CleanOldNotifications() error {
	threeDaysAgo := time.Now().AddDate(0, 0, -3)
	return r.db.Unscoped().Where("created_at < ?", threeDaysAgo).Delete(&models.Notification{}).Error
}
