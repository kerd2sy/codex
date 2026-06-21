package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/features/notifications/repositories"
	"tabarak-pharma-backend/internal/models"

	"firebase.google.com/go/v4/messaging"
)

type NotificationService struct {
	repo *repositories.NotificationRepository
}

func NewNotificationService() *NotificationService {
	return &NotificationService{
		repo: repositories.NewNotificationRepository(db.DB),
	}
}

func (s *NotificationService) GetMyNotifications(user *models.User, app string) ([]models.Notification, error) {
	go s.SyncNotifications(user)
	return s.repo.GetUserNotifications(user.ID, app)
}

func (s *NotificationService) GetUnreadCount(user *models.User) (int64, error) {
	go s.SyncNotifications(user)
	return s.repo.GetUnreadCount(user.ID)
}

func (s *NotificationService) MarkAsRead(user *models.User, id uint) error {
	return s.repo.MarkAsRead(user.ID, id)
}

func (s *NotificationService) MarkAllAsRead(user *models.User) error {
	return s.repo.MarkAllAsRead(user.ID)
}

func (s *NotificationService) Dismiss(user *models.User, id uint) error {
	return s.repo.Dismiss(user.ID, id)
}

func (s *NotificationService) ClearAll(user *models.User) error {
	return s.repo.ClearAll(user.ID)
}

func (s *NotificationService) UpdatePushTokens(user *models.User, fcmToken, expoToken string) error {
	return s.repo.UpdatePushTokens(user.ID, fcmToken, expoToken)
}

func (s *NotificationService) CleanOldNotifications() error {
	return s.repo.CleanOldNotifications()
}

func (s *NotificationService) SyncNotifications(user *models.User) {
	log.Printf("[Sync] Starting sync for user %d (%s)...", user.ID, user.Username)
	if len(user.Pharmacies) == 0 {
		log.Printf("[Sync] User %d has no pharmacies, skipping.", user.ID)
		return
	}

	// Set Cairo Time
	loc, err := time.LoadLocation("Africa/Cairo")
	if err != nil {
		// Fallback to UTC+3 if location loading fails
		loc = time.FixedZone("EEST", 3*3600)
	}
	nowCairo := time.Now().In(loc)

	codes := make([]int, 0)
	codeMap := make(map[int]uint)
	nameMap := make(map[int]string)
	
	re := regexp.MustCompile(`\D`)
	for _, p := range user.Pharmacies {
		clean := re.ReplaceAllString(p.Code, "")
		var c int
		fmt.Sscanf(clean, "%d", &c)
		if c > 0 {
			codes = append(codes, c)
			codeMap[c] = p.ID
			nameMap[c] = p.Name
		}
	}

	if len(codes) == 0 {
		return
	}

	phStr := s.joinCodes(codes)
	threeDaysAgo := nowCairo.AddDate(0, 0, -3).Format("2006-01-02")

	type movement struct {
		Table     string
		IDCol     string
		Type      string
		BaseTitle string
		Icon      string
		Color     string
		HasClose  bool
		HasPrint  bool
		LinkCol   string
	}

	movements := []movement{
		{"INVOICES_H", "INVOICES_H_ID", "purchase", "فاتورة مشتريات", "cart-outline", "#43A047", true, true, ""},
		{"INVOICES_HH", "INVOICES_HH_ID", "purchase", "فاتورة مشتريات (آجل)", "cart-outline", "#43A047", false, false, ""},
		{"ORDER_H", "ORDER_H_ID", "sale", "فاتورة مبيعات", "receipt-outline", "#1E88E5", true, true, "ORDER_HH_ID"},
		{"INVOICES_R_H", "INVOICES_R_H_ID", "return", "مرتجع مشتريات", "return-down-back-outline", "#E53935", true, true, ""},
		{"INVOICES_RR_H", "INVOICES_RR_H_ID", "return", "مرتجع مشتريات (آجل)", "return-down-back-outline", "#E53935", false, false, ""},
		{"ORDER_R_H", "ORDER_R_H_ID", "return", "مرتجع مبيعات", "return-down-back-outline", "#E53935", true, true, "ORDER_H_ID"},
		{"INCOME_CASH", "INCOME_CASH_ID", "cash", "دفع نقدية", "cash-outline", "#FB8C00", false, false, ""},
		{"PAY_CASH", "PAY_CASH_ID", "cash", "استلام نقدية", "cash-outline", "#43A047", false, false, ""},
	}

	for _, m := range movements {
		cols := []string{m.IDCol, "DATE_D", "TIME_T", "ACCOUNT_ID"}
		if m.Type == "cash" {
			cols = append(cols, "CAST(CASH AS DOUBLE PRECISION)")
		} else {
			cols = append(cols, "CAST(TOTAL_TOTAL AS DOUBLE PRECISION)")
		}
		
		if m.LinkCol != "" {
			cols = append(cols, m.LinkCol)
		}
		
		if m.HasClose { cols = append(cols, "CLOSE_") }
		if m.HasPrint { cols = append(cols, "PRINT_") }

		query := fmt.Sprintf(`SELECT FIRST 15 %s FROM %s WHERE ACCOUNT_ID IN (%s) AND DATE_D >= '%s' ORDER BY %s DESC`, 
			strings.Join(cols, ", "), m.Table, phStr, threeDaysAgo, m.IDCol)

		rows, err := db.FB.Query(query)
		if err != nil {
			log.Printf("[Sync] Query failed for %s: %v", m.Table, err)
			continue
		}

		for rows.Next() {
			var id int
			var date, timeT string
			var accID int
			var amount float64
			var closeVal, printVal, linkID int
			
			dest := []interface{}{&id, &date, &timeT, &accID, &amount}
			if m.LinkCol != "" { dest = append(dest, &linkID) }
			if m.HasClose { dest = append(dest, &closeVal) }
			if m.HasPrint { dest = append(dest, &printVal) }
			
			rows.Scan(dest...)

			// Check if finalized
			isClosedOrPrinted := true
			if m.HasClose {
				isClosedOrPrinted = isClosedOrPrinted && (closeVal != 0)
			}
			if m.HasPrint {
				isClosedOrPrinted = isClosedOrPrinted || (printVal != 0)
			}
			
			// If it's linked to another document (e.g. converted from order), it's finalized
			if m.LinkCol != "" && linkID != 0 {
				isClosedOrPrinted = true
			}

			if !isClosedOrPrinted {
				continue
			}

			prefix := m.Table
			if m.Table == "ORDER_H" {
				prefix = "O"
			} else if m.Table == "ORDER_R_H" {
				prefix = "OR"
			}
			targetID := fmt.Sprintf("%s_%d", prefix, id)
			var existing int64
			db.DB.Model(&models.Notification{}).Where("user_id = ? AND target_id = ?", user.ID, targetID).Count(&existing)
			if existing > 0 {
				continue
			}

			pName := nameMap[accID]
			pID := codeMap[accID]
			
			var desc string
			if m.Type == "return" {
				desc = fmt.Sprintf("تم اجراء المرتجع بنجاح\nصيدلية: %s\nمرتجع رقم: %d\nقيمة المرتجع: %.2f ج.م", pName, id, amount)
			} else if m.Type == "purchase" {
				desc = fmt.Sprintf("تم إنشاء فاتورة بنجاح\nصيدلية: %s\nرقم الفاتورة: %d\nقيمة الفاتورة: %.2f ج.م", pName, id, amount)
			} else if m.Type == "cash" {
				desc = fmt.Sprintf("تمت العملية بنجاح\nصيدلية: %s\nالمبلغ: %.2f ج.م\nتاريخ: %s", pName, amount, strings.TrimSpace(date))
			} else {
				desc = fmt.Sprintf("صيدلية: %s\nالقيمة: %.2f ج.م\nالتاريخ: %s", pName, amount, strings.TrimSpace(date))
			}

			note := models.Notification{
				UserID:      &user.ID,
				PharmacyID:  &pID,
				Title:       m.BaseTitle,
				Description: desc,
				Icon:        m.Icon,
				Color:       m.Color,
				Unread:      true,
				Type:        m.Type,
				TargetID:    targetID,
			}

			note.CreatedAt = nowCairo

			if err := db.DB.Create(&note).Error; err != nil {
				log.Printf("[Sync] Failed to create note %s: %v", targetID, err)
			} else {
				// Send Push Notifications (Dual Delivery)
				data := map[string]interface{}{
					"id":        fmt.Sprintf("%d", note.ID),
					"target_id": note.TargetID,
					"type":      note.Type,
				}

				if user.ExpoPushToken != "" {
					go s.SendExpoPush(user.ExpoPushToken, note.Title, note.Description, data)
				}
				if user.FCMToken != "" {
					go s.SendFCMPush(user.FCMToken, note.Title, note.Description, data)
				}
			}
		}
		rows.Close()
	}
}

func (s *NotificationService) parseFBDateTime(dStr, tStr string, loc *time.Location) time.Time {
	dStr = strings.TrimSpace(dStr)
	tStr = strings.TrimSpace(tStr)
	if dStr == "" {
		return time.Now().In(loc)
	}

	// Handle ISO or YYYY-MM-DD
	if strings.Contains(dStr, "T") {
		dStr = strings.Split(dStr, "T")[0]
	}

	dateParts := strings.Split(dStr, "-")
	if len(dateParts) != 3 {
		// Try DD.MM.YYYY
		dateParts = strings.Split(dStr, ".")
		if len(dateParts) == 3 {
			dStr = fmt.Sprintf("%s-%s-%s", dateParts[2], dateParts[1], dateParts[0])
		}
	}

	if tStr == "" {
		tStr = "00:00:00"
	} else if len(tStr) == 5 {
		tStr += ":00"
	}

	fullStr := fmt.Sprintf("%s %s", dStr, tStr)
	t, err := time.ParseInLocation("2006-01-02 15:04:05", fullStr, loc)
	if err != nil {
		return time.Now().In(loc)
	}
	return t
}

func (s *NotificationService) joinCodes(codes []int) string {
	strs := make([]string, len(codes))
	for i, c := range codes {
		strs[i] = fmt.Sprintf("%d", c)
	}
	return strings.Join(strs, ",")
}
func (s *NotificationService) SendExpoPush(token, title, body string, data map[string]interface{}) {
	if token == "" || !strings.HasPrefix(token, "ExponentPushToken") {
		return
	}

	url := "https://exp.host/--/api/v2/push/send"
	message := map[string]interface{}{
		"to":    token,
		"title": title,
		"body":  body,
		"data":  data,
		"sound": "notification.mp3",
		"priority": "high",
		"channelId": "default",
	}

	jsonValue, _ := json.Marshal(message)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonValue))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Push] Failed to send push: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Push] Expo API returned status: %d", resp.StatusCode)
	} else {
		log.Printf("[Push] Notification sent successfully to %s", token)
	}
}

func (s *NotificationService) SendFCMPush(token, title, body string, data map[string]interface{}) {
	if token == "" || core.FCMClient == nil {
		return
	}

	// Convert map[string]interface{} to map[string]string for FCM
	stringData := make(map[string]string)
	for k, v := range data {
		stringData[k] = fmt.Sprintf("%v", v)
	}

	message := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: stringData,
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				ChannelID: "default",
				Color: "#FF7043",
			},
		},
	}

	response, err := core.FCMClient.Send(context.Background(), message)
	if err != nil {
		log.Printf("[FCM] Failed to send push to %s: %v", token, err)
	} else {
		log.Printf("[FCM] Notification sent successfully: %s", response)
	}
}
