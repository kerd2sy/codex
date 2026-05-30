package gomla

import (
	"database/sql"
	"fmt"
	"strings"
	"tabarak-pharma-backend/internal/db"
	"time"
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
		return nil, err
	}

	items := make([]map[string]interface{}, 0)
	for itemsRows.Next() {
		var (
			itemID, name, prodID, batch, expire, barcode sql.NullString
			qty, consumer, itemTotal                     sql.NullFloat64
		)
		itemsRows.Scan(&itemID, &name, &qty, &consumer, &itemTotal, &prodID, &batch, &expire, &barcode)

		batchVal := cleanBatchNumber(batch.String)
		expireVal := formatDate(strings.TrimSpace(expire.String))
		suggestedBatch := ""
		suggestedExpiry := ""

		if batchVal == "" && prodID.String != "" {
			var latestBatch, latestExpire sql.NullString
			err := db.FB.QueryRow(`
				SELECT FIRST 1 PROD_SN_NO, EXPIRE_DATE
				FROM INVOICES_D
				WHERE PROD_ID = ? AND PROD_SN_NO IS NOT NULL AND PROD_SN_NO <> '' AND EXPIRE_DATE IS NOT NULL AND EXPIRE_DATE <> ''
				ORDER BY INVOICES_D_ID DESC
			`, prodID.String).Scan(&latestBatch, &latestExpire)
			if err == nil && latestBatch.String != "" {
				suggestedBatch = cleanBatchNumber(latestBatch.String)
				suggestedExpiry = formatDate(strings.TrimSpace(latestExpire.String))
			}
		}

		items = append(items, map[string]interface{}{
			"id":               itemID.String,
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
		})
	}

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

func (s *GomlaService) UpdateItemBatchAndExpiry(dID int, batch string, expiry string, qty float64) error {
	// Simple validation
	if batch == "" || expiry == "" {
		return fmt.Errorf("batch and expiry cannot be empty")
	}

	// Try to parse expiry as YYYY-MM-DD to validate format (optional, assume frontend sends YYYY-MM-DD)
	_, err := time.Parse("2006-01-02", expiry)
	if err != nil {
		return fmt.Errorf("invalid expiry date format, expected YYYY-MM-DD")
	}

	return s.repo.SplitOrUpdateItem(dID, batch, expiry, qty)
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
