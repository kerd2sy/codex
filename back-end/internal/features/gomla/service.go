package gomla

import (
	"database/sql"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
	"tabarak-pharma-backend/internal/features/notifications"
)

type GomlaService struct {
	repo *GomlaRepository
}

func NewGomlaService() *GomlaService {
	return &GomlaService{
		repo: NewGomlaRepository(),
	}
}

func (s *GomlaService) GetInvoiceDetail(id int) (map[string]interface{}, error) {
	headerRow, itemsRows, err := s.repo.GetInvoiceDetails(id)
	if err != nil {
		return nil, err
	}
	defer itemsRows.Close()

	var (
		invID, pharmName, writer, accountID sql.NullString
		date, timeRaw                       sql.NullString
		total                               sql.NullFloat64
	)
	err = headerRow.Scan(&invID, &date, &timeRaw, &total, &writer, &pharmName, &accountID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("Invoice not found or is not a wholesale invoice (Store 3)")
		}
		return nil, err
	}

	items := make([]map[string]interface{}, 0)
	var itemIDs []int

	for itemsRows.Next() {
		var (
			itemID, name, prodID, batch, expire, barcode, compLast, poisAll, usersLast sql.NullString
			qty, consumer, itemTotal                                                   sql.NullFloat64
		)
		itemsRows.Scan(&itemID, &name, &qty, &consumer, &itemTotal, &prodID, &batch, &expire, &barcode, &compLast, &poisAll, &usersLast)

		isAuditedByApp := compLast.String == "APP_AUDIT"

		batchVal := ""
		expireVal := ""
		suggestedBatch := ""
		suggestedExpiry := ""

		if isAuditedByApp {
			batchVal = cleanBatchNumber(batch.String)
			expireVal = formatDate(strings.TrimSpace(expire.String))
		} else {
			suggestedBatch = cleanBatchNumber(batch.String)
			suggestedExpiry = formatDate(strings.TrimSpace(expire.String))
		}

		idStr := strings.TrimSpace(itemID.String)
		idInt, _ := strconv.Atoi(idStr)
		itemIDs = append(itemIDs, idInt)

		items = append(items, map[string]interface{}{
			"id":               idStr,
			"name":             strings.TrimSpace(name.String),
			"qty":              qty.Float64,
			"price":            consumer.Float64,
			"total":            itemTotal.Float64,
			"prod_id":          strings.TrimSpace(prodID.String),
			"batch":            batchVal,
			"expire_date":      expireVal,
			"suggested_batch":  suggestedBatch,
			"suggested_expiry": suggestedExpiry,
			"barcode":          strings.TrimSpace(barcode.String),
			"location":         strings.TrimSpace(poisAll.String),
			"audited_by_name":  strings.TrimSpace(usersLast.String),
		})
	}

	// Fetch ItemAuditRecords to track prepared and modified by
	auditMap := make(map[int]models.ItemAuditRecord)
	if db.DB != nil && len(itemIDs) > 0 {
		var records []models.ItemAuditRecord
		db.DB.Where("item_id IN ?", itemIDs).Find(&records)
		for _, rec := range records {
			auditMap[rec.ItemID] = rec
		}
	}

	// Inject custom audit details
	for _, item := range items {
		idStr := item["id"].(string)
		idInt, _ := strconv.Atoi(idStr)
		if rec, exists := auditMap[idInt]; exists {
			if rec.PreparedByUserName != "" {
				item["audited_by_name"] = rec.PreparedByUserName
			}
			if rec.ModifiedByUserName != "" {
				item["modified_by_name"] = rec.ModifiedByUserName
			}
		}
	}

	sort.Slice(items, func(i, j int) bool {
		locI := items[i]["location"].(string)
		locJ := items[j]["location"].(string)
		if locI != locJ {
			return locI < locJ
		}
		nameI := items[i]["name"].(string)
		nameJ := items[j]["name"].(string)
		return nameI < nameJ
	})

	return map[string]interface{}{
		"id":            strings.TrimSpace(invID.String),
		"date":          formatDate(strings.TrimSpace(date.String)),
		"time":          strings.TrimSpace(timeRaw.String),
		"total":         total.Float64,
		"writer":        strings.TrimSpace(writer.String),
		"pharmacy_name": strings.TrimSpace(pharmName.String),
		"pharmacy_code": strings.TrimSpace(accountID.String),
		"items":         items,
	}, nil
}

func (s *GomlaService) GetRecentInvoices(limit int, dateStr string) ([]map[string]interface{}, error) {
	rows, err := s.repo.GetRecentInvoices(limit, dateStr)
	if err != nil {
		return nil, err
	}
	return s.parseInvoiceRows(rows)
}

func (s *GomlaService) GetTodayInvoices() ([]map[string]interface{}, error) {
	rows, err := s.repo.GetTodayInvoices()
	if err != nil {
		return nil, err
	}
	return s.parseInvoiceRows(rows)
}

func (s *GomlaService) parseInvoiceRows(rows *sql.Rows) ([]map[string]interface{}, error) {
	defer rows.Close()

	invoices := make([]map[string]interface{}, 0)
	var invoiceIDs []int

	for rows.Next() {
		var id sql.NullInt64
		var date, accountName sql.NullString
		var total sql.NullFloat64
		var totalItems, auditedItems sql.NullInt64

		if err := rows.Scan(&id, &date, &total, &accountName, &totalItems, &auditedItems); err != nil {
			fmt.Println("Scan error:", err)
			continue
		}

		if total.Float64 > 0 {
			isFullyAudited := totalItems.Int64 > 0 && totalItems.Int64 == auditedItems.Int64

			inv := map[string]interface{}{
				"id":               id.Int64,
				"date":             formatDate(strings.TrimSpace(date.String)),
				"total":            total.Float64,
				"clientName":       strings.TrimSpace(accountName.String),
				"is_fully_audited": isFullyAudited,
				"audited_items":    auditedItems.Int64,
				"total_items":      totalItems.Int64,
				"editing_by_name":  "",
				"audited_by_name":  "",
				"audit_status":     "",
			}
			invoices = append(invoices, inv)
			invoiceIDs = append(invoiceIDs, int(id.Int64))
		}
	}

	// Fetch Postgres audit records for these invoices
	auditMap, err := s.GetInvoiceAuditRecords(invoiceIDs)
	if err == nil {
		var userIDs []uint
		for _, record := range auditMap {
			if record.EditingByUserID != nil {
				userIDs = append(userIDs, *record.EditingByUserID)
			}
			if record.AuditedByUserID != nil {
				userIDs = append(userIDs, *record.AuditedByUserID)
			}
		}

		avatars := make(map[uint]string)
		if len(userIDs) > 0 {
			var users []models.User
			if err := db.DB.Select("id, avatar_url").Where("id IN ?", userIDs).Find(&users).Error; err == nil {
				for _, u := range users {
					avatars[u.ID] = u.AvatarURL
				}
			}
		}

		for i, inv := range invoices {
			id := int(inv["id"].(int64))
			if record, ok := auditMap[id]; ok {
				invoices[i]["editing_by_name"] = record.EditingByUserName
				invoices[i]["audited_by_name"] = record.AuditedByUserName
				invoices[i]["audit_status"] = record.Status
				
				if record.EditingByUserID != nil {
					invoices[i]["editing_by_avatar"] = avatars[*record.EditingByUserID]
				}
				if record.AuditedByUserID != nil {
					invoices[i]["audited_by_avatar"] = avatars[*record.AuditedByUserID]
				}
				
				var prepTime string
				if record.StartedAt != nil {
					endTime := time.Now()
					if record.FinishedAt != nil {
						endTime = *record.FinishedAt
					}
					duration := endTime.Sub(*record.StartedAt)
					hours := int(duration.Hours())
					minutes := int(duration.Minutes()) % 60
					
					var parts []string
					if hours > 0 {
						parts = append(parts, fmt.Sprintf("%d ساعة", hours))
					}
					if minutes > 0 {
						parts = append(parts, fmt.Sprintf("%d دقيقة", minutes))
					}
					if len(parts) > 0 {
						prepTime = strings.Join(parts, " و ")
					} else {
						prepTime = "أقل من دقيقة"
					}
				}
				invoices[i]["preparation_time"] = prepTime
				invoices[i]["updated_at"] = record.UpdatedAt
			}
		}
	}

	sort.Slice(invoices, func(i, j int) bool {
		invI := invoices[i]
		invJ := invoices[j]
		
		isFinishedI := invI["is_fully_audited"].(bool) || invI["audit_status"].(string) == "audited"
		isFinishedJ := invJ["is_fully_audited"].(bool) || invJ["audit_status"].(string) == "audited"
		
		isInProgressI := !isFinishedI && (invI["audit_status"].(string) == "editing" || invI["audited_items"].(int64) > 0)
		isInProgressJ := !isFinishedJ && (invJ["audit_status"].(string) == "editing" || invJ["audited_items"].(int64) > 0)
		
		getRank := func(isFinished, isInProgress bool) int {
			if isInProgress { return 1 } // Highest priority (Top)
			if !isFinished { return 2 }  // New invoices (Middle)
			return 3                     // Finished (Bottom)
		}
		
		rankI := getRank(isFinishedI, isInProgressI)
		rankJ := getRank(isFinishedJ, isInProgressJ)
		
		if rankI != rankJ {
			return rankI < rankJ
		}
		
		// If both are In Progress (Rank 1), sort by most recent update
		if rankI == 1 {
			var timeI, timeJ time.Time
			if t, ok := invI["updated_at"].(time.Time); ok { timeI = t }
			if t, ok := invJ["updated_at"].(time.Time); ok { timeJ = t }
			
			if !timeI.IsZero() && !timeJ.IsZero() && !timeI.Equal(timeJ) {
				return timeI.After(timeJ)
			}
		}
		
		// Fallback for all categories (Rank 2, Rank 3, or Rank 1 without updated_at)
		idI := invI["id"].(int64)
		idJ := invJ["id"].(int64)
		return idI > idJ
	})

	return invoices, nil
}
func (s *GomlaService) UpdateItemBatchAndExpiry(dID int, batch string, expiry string, qty float64, userID uint, userName string) error {
	// Simple validation
	if batch == "" || expiry == "" {
		return fmt.Errorf("batch and expiry cannot be empty")
	}

	// Try to parse expiry as YYYY-MM-DD to validate format (optional, assume frontend sends YYYY-MM-DD)
	_, err := time.Parse("2006-01-02", expiry)
	if err != nil {
		return fmt.Errorf("invalid expiry date format, expected YYYY-MM-DD")
	}

	invoiceID, err := s.repo.SplitOrUpdateItem(dID, batch, expiry, qty, userName)
	if err != nil {
		return err
	}

	if db.DB != nil {
		// Track Item Preparation and Modification
		var itemRecord models.ItemAuditRecord
		errItem := db.DB.Where("item_id = ?", dID).First(&itemRecord).Error
		if errItem != nil {
			// First time this item is prepared
			itemRecord = models.ItemAuditRecord{
				ItemID:             dID,
				PreparedByUserID:   &userID,
				PreparedByUserName: userName,
				UpdatedAt:          time.Now(),
			}
			db.DB.Create(&itemRecord)
		} else {
			// It was prepared before, so this is a modification
			if itemRecord.PreparedByUserID != nil && *itemRecord.PreparedByUserID != userID {
				itemRecord.ModifiedByUserID = &userID
				itemRecord.ModifiedByUserName = userName
			} else if itemRecord.PreparedByUserID != nil && *itemRecord.PreparedByUserID == userID {
				// If the same user modifies it, clear the modification info
				itemRecord.ModifiedByUserID = nil
				itemRecord.ModifiedByUserName = ""
			}
			itemRecord.UpdatedAt = time.Now()
			db.DB.Save(&itemRecord)
		}

		if invoiceID > 0 {
			var record models.InvoiceAuditRecord
			err := db.DB.Where("invoice_id = ?", invoiceID).First(&record).Error
			if err != nil {
				record = models.InvoiceAuditRecord{
					InvoiceID:         invoiceID,
					Status:            "editing",
					UpdatedAt:         time.Now(),
					EditingByUserID:   &userID,
					EditingByUserName: userName,
					AuditedByUserID:   &userID,
					AuditedByUserName: userName,
				}
				db.DB.Create(&record)
			} else {
				if record.AuditedByUserID == nil {
					record.AuditedByUserID = &userID
					record.AuditedByUserName = userName
				}
				// Lock the editor to the owner
				if record.AuditedByUserID != nil {
					record.EditingByUserID = record.AuditedByUserID
					record.EditingByUserName = record.AuditedByUserName
				}
				record.UpdatedAt = time.Now()
				db.DB.Save(&record)
			}
		}
	}

	return nil
}

func formatDate(d string) string {
	if d == "" {
		return ""
	}
	if strings.Contains(d, "T") {
		d = strings.Split(d, "T")[0]
	}
	return d
}

func cleanBatchNumber(b string) string {
	b = strings.TrimSpace(b)
	if strings.Contains(b, ".") {
		parts := strings.Split(b, ".")
		if len(parts) == 2 {
			isAllZeros := true
			for _, char := range parts[1] {
				if char != '0' {
					isAllZeros = false
					break
				}
			}
			if isAllZeros {
				return parts[0]
			}
		}
	}
	return b
}

func (s *GomlaService) GetProductStockBalance(prodID string) ([]map[string]interface{}, error) {
	return s.repo.GetProductStockBalance(prodID)
}

func (s *GomlaService) SaveBatchHistory(prodID string, batch string, expiry string, userID uint) error {
	history := models.ProductBatchHistory{
		ProdID: prodID,
		Batch:  batch,
		Expiry: expiry,
		UserID: userID,
	}
	
	// Create or overwrite. Easiest is just to create a new record so we have history,
	// but since we only care about the most recent one, we can just insert.
	// We'll get the most recent one by sorting by created_at DESC.
	if db.DB != nil {
		return db.DB.Create(&history).Error
	}
	return nil
}

func (s *GomlaService) GetProductBatchHistory(prodID string) (*models.ProductBatchHistory, error) {
	var history models.ProductBatchHistory
	
	if db.DB != nil {
		// Get the most recent entry for this product today
		today := time.Now().Truncate(24 * time.Hour)
		err := db.DB.Where("prod_id = ? AND created_at >= ?", prodID, today).
			Order("created_at desc").
			First(&history).Error
			
		if err != nil {
			return nil, err
		}
		return &history, nil
	}
	return nil, fmt.Errorf("database not initialized")
}

func (s *GomlaService) CleanOldBatchHistory() error {
	if db.DB != nil {
		threeDaysAgo := time.Now().AddDate(0, 0, -3)
		// Unscoped to permanently delete
		return db.DB.Unscoped().Where("created_at < ?", threeDaysAgo).Delete(&models.ProductBatchHistory{}).Error
	}
	return nil
}

func (s *GomlaService) UpdateInvoiceAuditStatus(invoiceID int, status string, userID uint, userName string) error {
	if db.DB == nil {
		return nil
	}

	var record models.InvoiceAuditRecord
	err := db.DB.Where("invoice_id = ?", invoiceID).First(&record).Error
	if err != nil {
		// Create new
		now := time.Now()
		record = models.InvoiceAuditRecord{
			InvoiceID: invoiceID,
			Status:    status,
			UpdatedAt: now,
		}
		switch status {
		case "editing":
			record.EditingByUserID = &userID
			record.EditingByUserName = userName
			record.StartedAt = &now
		case "audited":
			record.AuditedByUserID = &userID
			record.AuditedByUserName = userName
			record.FinishedAt = &now
		}
		errCreate := db.DB.Create(&record).Error
		if errCreate == nil {
			if status == "editing" {
				go sendAdminInvoiceNotification(invoiceID, "editing", userName, record.StartedAt, nil)
			} else if status == "audited" {
				go sendAdminInvoiceNotification(invoiceID, "audited", userName, record.StartedAt, record.FinishedAt)
			}
		}
		return errCreate
	}

	// Update existing
	record.Status = status
	now := time.Now()
	record.UpdatedAt = now
	
	var isFirstEdit bool
	var isFinished bool

	switch status {
	case "editing":
		if record.StartedAt == nil {
			record.StartedAt = &now
			isFirstEdit = true
		}
		if record.AuditedByUserID == nil {
			record.EditingByUserID = &userID
			record.EditingByUserName = userName
		} else {
			// Invoice is already owned by someone who audited an item, lock to them
			record.EditingByUserID = record.AuditedByUserID
			record.EditingByUserName = record.AuditedByUserName
		}
	case "audited":
		if record.FinishedAt == nil {
			record.FinishedAt = &now
			isFinished = true
		}
		if record.AuditedByUserID == nil {
			record.AuditedByUserID = &userID
			record.AuditedByUserName = userName
		}
		record.EditingByUserID = record.AuditedByUserID
		record.EditingByUserName = record.AuditedByUserName
	case "clear": // someone left
		if record.Status == "editing" {
			record.Status = "pending" // reset if it wasn't audited
		}
		// If no one ever audited anything, we can clear the temporary editor
		if record.AuditedByUserID == nil {
			record.EditingByUserID = nil
			record.EditingByUserName = ""
			record.StartedAt = nil // clear start time if they left without auditing
		} else {
			// Keep it locked to the owner
			record.EditingByUserID = record.AuditedByUserID
			record.EditingByUserName = record.AuditedByUserName
		}
	}
	
	saveErr := db.DB.Save(&record).Error
	
	// Trigger notifications after successful save
	if saveErr == nil {
		if status == "editing" && isFirstEdit {
			go sendAdminInvoiceNotification(invoiceID, "editing", userName, record.StartedAt, nil)
		} else if status == "audited" && isFinished {
			go sendAdminInvoiceNotification(invoiceID, "audited", record.AuditedByUserName, record.StartedAt, record.FinishedAt)
		}
	}
	
	return saveErr
}

func sendAdminInvoiceNotification(invoiceID int, status string, userName string, startedAt, finishedAt *time.Time) {
	if db.FB == nil || db.DB == nil {
		return
	}

	var totalItems, auditedItems int
	err := db.FB.QueryRow(`
		SELECT 
			(SELECT COUNT(INVOICES_D_ID) FROM INVOICES_D D WHERE D.INVOICES_H_ID = ?) as TOTAL_ITEMS,
			(SELECT COUNT(INVOICES_D_ID) FROM INVOICES_D D WHERE D.INVOICES_H_ID = ? AND D.COMPUTER_LAST = 'APP_AUDIT') as AUDITED_ITEMS
		FROM RDB$DATABASE
	`, invoiceID, invoiceID).Scan(&totalItems, &auditedItems)
	
	if err != nil {
		fmt.Println("Error fetching item counts for notification:", err)
		return
	}

	var title, description, icon, color string

	if status == "editing" {
		title = "جاري تحضير فاتورة"
		description = fmt.Sprintf("فاتورة رقم %d\nعدد الأصناف: %d\nبواسطة: %s", invoiceID, totalItems, userName)
		icon = "time-outline"
		color = "#FF9800"
	} else if status == "audited" {
		title = "تم الانتهاء من تحضير فاتورة"
		timeStr := ""
		if startedAt != nil && finishedAt != nil {
			duration := finishedAt.Sub(*startedAt)
			mins := int(duration.Minutes())
			if mins < 1 {
				timeStr = "\nاستغرقت: أقل من دقيقة"
			} else {
				timeStr = fmt.Sprintf("\nاستغرقت: %d دقيقة", mins)
			}
		}
		
		descPrefix := ""
		if totalItems > 0 && totalItems != auditedItems {
			descPrefix = fmt.Sprintf("⚠️ تم الإنهاء مع نواقص (%d من %d)\n", auditedItems, totalItems)
		} else {
			descPrefix = fmt.Sprintf("عدد الأصناف: %d\n", totalItems)
		}
		
		description = fmt.Sprintf("%sفاتورة رقم %d\nبواسطة: %s%s", descPrefix, invoiceID, userName, timeStr)
		icon = "checkmark-done-circle"
		
		if totalItems > 0 && totalItems != auditedItems {
			color = "#F44336" // Red for incomplete
			icon = "warning-outline"
		} else {
			color = "#4CAF50"
		}
	} else {
		return // Ignore other statuses
	}

	// Find admins
	var admins []models.User
	db.DB.Joins("JOIN user_roles ON user_roles.user_id = users.id").
		Joins("JOIN roles ON roles.id = user_roles.role_id").
		Where("roles.name IN ?", []string{"admin", "manager"}).
		Find(&admins)

	notifService := notifications.NewNotificationService()

	for _, admin := range admins {
		adminID := admin.ID
		notif := models.Notification{
			Title:       title,
			Description: description,
			Icon:        icon,
			Color:       color,
			Unread:      true,
			UserID:      &adminID,
			Type:        "system",
			CreatedAt:   time.Now(),
		}
		if err := db.DB.Create(&notif).Error; err == nil {
			data := map[string]interface{}{
				"id":   fmt.Sprintf("%d", notif.ID),
				"type": notif.Type,
			}
			if admin.ExpoPushToken != "" {
				go notifService.SendExpoPush(admin.ExpoPushToken, notif.Title, notif.Description, data)
			}
			if admin.FCMToken != "" {
				go notifService.SendFCMPush(admin.FCMToken, notif.Title, notif.Description, data)
			}
		}
	}
}

func (s *GomlaService) GetInvoiceAuditRecords(invoiceIDs []int) (map[int]models.InvoiceAuditRecord, error) {
	result := make(map[int]models.InvoiceAuditRecord)
	if db.DB == nil || len(invoiceIDs) == 0 {
		return result, nil
	}

	var records []models.InvoiceAuditRecord
	err := db.DB.Where("invoice_id IN ?", invoiceIDs).Find(&records).Error
	if err != nil {
		return result, err
	}

	for _, r := range records {
		result[r.InvoiceID] = r
	}

	return result, nil
}

func (s *GomlaService) GetTopPreparers(dateStr string) ([]map[string]interface{}, error) {
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	// 1. Get all item IDs and their corresponding invoice IDs for store 3 on this date from Firebird
	rows, err := db.FB.Query(`
		SELECT D.INVOICES_D_ID, D.INVOICES_H_ID
		FROM INVOICES_D D
		JOIN INVOICES_H H ON D.INVOICES_H_ID = H.INVOICES_H_ID
		WHERE H.STORE_ID = 3 AND H.DATE_D = ?
	`, dateStr)
	if err != nil {
		return nil, fmt.Errorf("failed to query firebird: %w", err)
	}
	defer rows.Close()

	itemToInvoice := make(map[int]int)
	var itemIDs []int
	for rows.Next() {
		var itemID, invoiceID int
		if err := rows.Scan(&itemID, &invoiceID); err == nil {
			itemToInvoice[itemID] = invoiceID
			itemIDs = append(itemIDs, itemID)
		}
	}

	if len(itemIDs) == 0 {
		return []map[string]interface{}{}, nil
	}

	// 2. Query Postgres for ItemAuditRecords for these item IDs
	var auditRecords []models.ItemAuditRecord
	err = db.DB.Where("item_id IN ? AND prepared_by_user_name IS NOT NULL AND prepared_by_user_name != ''", itemIDs).Find(&auditRecords).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query postgres item audit records: %w", err)
	}

	// Find all unique invoice IDs to fetch their owners
	var invoiceIDs []int
	invoiceSet := make(map[int]bool)
	for _, invID := range itemToInvoice {
		if !invoiceSet[invID] {
			invoiceSet[invID] = true
			invoiceIDs = append(invoiceIDs, invID)
		}
	}

	// Fetch invoice owners (the first user who prepared an item in the invoice)
	invoiceOwners := make(map[int]string)
	if len(invoiceIDs) > 0 {
		var invRecords []models.InvoiceAuditRecord
		db.DB.Where("invoice_id IN ? AND audited_by_user_name IS NOT NULL AND audited_by_user_name != ''", invoiceIDs).Find(&invRecords)
		for _, invRec := range invRecords {
			ownerKey := invRec.AuditedByUserName
			if invRec.AuditedByUserID != nil {
				ownerKey = fmt.Sprintf("id_%d", *invRec.AuditedByUserID)
			}
			invoiceOwners[invRec.InvoiceID] = ownerKey
		}
	}

	// Group by user ID (or user name if ID is null)
	type preparerStats struct {
		UserID     uint
		UserName   string
		Invoices   map[int]bool
		ItemsCount int
	}

	statsMap := make(map[string]*preparerStats)
	var userIDs []uint

	for _, rec := range auditRecords {
		key := rec.PreparedByUserName
		if rec.PreparedByUserID != nil {
			key = fmt.Sprintf("id_%d", *rec.PreparedByUserID)
		}

		stats, exists := statsMap[key]
		if !exists {
			var uID uint
			if rec.PreparedByUserID != nil {
				uID = *rec.PreparedByUserID
				userIDs = append(userIDs, uID)
			}
			stats = &preparerStats{
				UserID:     uID,
				UserName:   rec.PreparedByUserName,
				Invoices:   make(map[int]bool),
				ItemsCount: 0,
			}
			statsMap[key] = stats
		}

		stats.ItemsCount++
		if invID, ok := itemToInvoice[rec.ItemID]; ok {
			ownerKey, hasOwner := invoiceOwners[invID]
			// Only credit the invoice to the user if they are the first preparer (owner), or if no owner is recorded yet
			if (hasOwner && ownerKey == key) || !hasOwner {
				stats.Invoices[invID] = true
			}
		}
	}

	// Fetch user avatars from Postgres
	avatars := make(map[uint]string)
	if len(userIDs) > 0 {
		var users []models.User
		if err := db.DB.Select("id, avatar_url").Where("id IN ?", userIDs).Find(&users).Error; err == nil {
			for _, u := range users {
				avatars[u.ID] = u.AvatarURL
			}
		}
	}

	// Convert statsMap to the final result list
	var result []map[string]interface{}
	for _, stats := range statsMap {
		avatar := ""
		if stats.UserID > 0 {
			avatar = avatars[stats.UserID]
		}
		result = append(result, map[string]interface{}{
			"userId":        fmt.Sprintf("%d", stats.UserID),
			"userName":      stats.UserName,
			"avatar":        avatar,
			"invoicesCount": len(stats.Invoices),
			"itemsCount":    stats.ItemsCount,
		})
	}

	// Sort in descending order by itemsCount
	sort.Slice(result, func(i, j int) bool {
		return result[i]["itemsCount"].(int) > result[j]["itemsCount"].(int)
	})

	return result, nil
}

