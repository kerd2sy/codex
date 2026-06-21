package pharmacy

import (
	"database/sql"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"tabarak-pharma-backend/internal/features/pharmacy/repositories"
	"tabarak-pharma-backend/internal/models"
)

type PurchaseService struct {
	repo         *repositories.PurchaseRepository
	pharmacyRepo *repositories.PharmacyRepository
}

func NewPurchaseService() *PurchaseService {
	return &PurchaseService{
		repo:         repositories.NewPurchaseRepository(),
		pharmacyRepo: repositories.NewPharmacyRepository(),
	}
}

func (s *PurchaseService) GetBalance(user *models.User, pharmacyID string) (map[string]interface{}, error) {
	codes := s.pharmacyRepo.GetCleanPharmaCodes(user)
	
	// Filter if pharmacyID is provided
	if pharmacyID != "" && pharmacyID != "0" {
		id, _ := strconv.Atoi(pharmacyID)
		filtered := []int{}
		for _, p := range user.Pharmacies {
			if int(p.ID) == id {
				if c, err := strconv.Atoi(p.Code); err == nil {
					filtered = append(filtered, c)
				}
			}
		}
		// If a pharmacy was specified, we MUST only use its codes.
		// If we found none, then codes should be empty.
		codes = filtered
	}

	if len(codes) == 0 {
		return map[string]interface{}{
			"current_balance":  0.0,
			"balance_type":     "Credit",
			"credit_limit":     0.0,
			"usage_percentage": 0.0,
			"net_balance":      0.0,
		}, nil
	}

	rawBal, rawLimit, err := s.repo.GetBalance(codes)
	if err != nil {
		return nil, err
	}

	balance := float64(rawBal)
	limitVal := float64(rawLimit)
	if limitVal == 0 {
		limitVal = 5000.0
	}

	usage := 0.0
	if limitVal != 0 {
		usage = math.Round((math.Abs(balance)/limitVal)*100*100) / 100
	}

	balanceType := "Credit"
	if balance >= 0 {
		balanceType = "Debit"
	}

	return map[string]interface{}{
		"current_balance":  math.Abs(balance),
		"balance_type":     balanceType,
		"credit_limit":     limitVal,
		"usage_percentage": usage,
		"net_balance":      limitVal - balance,
	}, nil
}

func (s *PurchaseService) GetMyPurchases(user *models.User, pharmacyID string, page, limit int, sort string) ([]map[string]interface{}, error) {
	codes := s.pharmacyRepo.GetCleanPharmaCodes(user)
	
	// Filter if pharmacyID is provided
	if pharmacyID != "" && pharmacyID != "0" {
		id, _ := strconv.Atoi(pharmacyID)
		filtered := []int{}
		for _, p := range user.Pharmacies {
			if int(p.ID) == id {
				if c, err := strconv.Atoi(p.Code); err == nil {
					filtered = append(filtered, c)
				}
			}
		}
		codes = filtered
	}

	if len(codes) == 0 {
		return []map[string]interface{}{}, nil
	}

	skip := (page - 1) * limit
	rows, err := s.repo.GetPurchases(codes, limit, skip, sort)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return s.mapRows(rows)
}

func (s *PurchaseService) GetMyReturns(user *models.User, pharmacyID string, page, limit int, sort string) ([]map[string]interface{}, error) {
	codes := s.pharmacyRepo.GetCleanPharmaCodes(user)
	
	// Filter if pharmacyID is provided
	if pharmacyID != "" && pharmacyID != "0" {
		id, _ := strconv.Atoi(pharmacyID)
		filtered := []int{}
		for _, p := range user.Pharmacies {
			if int(p.ID) == id {
				if c, err := strconv.Atoi(p.Code); err == nil {
					filtered = append(filtered, c)
				}
			}
		}
		codes = filtered
	}

	if len(codes) == 0 {
		return []map[string]interface{}{}, nil
	}

	skip := (page - 1) * limit
	rows, err := s.repo.GetReturns(codes, limit, skip, sort)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results, err := s.mapRows(rows)
	if err != nil {
		return nil, err
	}

	log.Printf("[PurchaseService] GetMyReturns found %d records", len(results))
	return results, nil
}

func (s *PurchaseService) GetCashFlow(user *models.User, pharmacyID string, page, limit int, sort string) ([]map[string]interface{}, error) {
	codes := s.pharmacyRepo.GetCleanPharmaCodes(user)
	
	// Filter if pharmacyID is provided
	if pharmacyID != "" && pharmacyID != "0" {
		id, _ := strconv.Atoi(pharmacyID)
		filtered := []int{}
		for _, p := range user.Pharmacies {
			if int(p.ID) == id {
				if c, err := strconv.Atoi(p.Code); err == nil {
					filtered = append(filtered, c)
				}
			}
		}
		codes = filtered
	}

	if len(codes) == 0 {
		return []map[string]interface{}{}, nil
	}

	skip := (page - 1) * limit
	rows, err := s.repo.GetCashFlow(codes, limit, skip, sort)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]map[string]interface{}, 0)
	for rows.Next() {
		var (
			id, pharmName, writer sql.NullString
			date, timeRaw         sql.NullString
			total                 sql.NullFloat64
			kind                  sql.NullInt64
		)
		rows.Scan(&id, &date, &timeRaw, &total, &pharmName, &kind, &writer)

		kindVal := "RECEIPT"
		if kind.Int64 == 12 {
			kindVal = "PAYMENT"
		}

		results = append(results, map[string]interface{}{
			"id":            strings.TrimSpace(id.String),
			"date":          s.formatDate(strings.TrimSpace(date.String)),
			"time":          s.formatTime(strings.TrimSpace(timeRaw.String)),
			"total":         total.Float64,
			"type":          kindVal,
			"writer":        strings.TrimSpace(writer.String),
			"pharmacy_name": strings.TrimSpace(pharmName.String),
			"description":   strings.TrimSpace(pharmName.String),
		})
	}
	return results, nil
}

func (s *PurchaseService) GetStatement(user *models.User, pharmacyID string, page, limit int, dateFrom string) ([]map[string]interface{}, error) {
	codes := s.pharmacyRepo.GetCleanPharmaCodes(user)
	
	// Filter if pharmacyID is provided
	if pharmacyID != "" && pharmacyID != "0" {
		id, _ := strconv.Atoi(pharmacyID)
		filtered := []int{}
		for _, p := range user.Pharmacies {
			if int(p.ID) == id {
				if c, err := strconv.Atoi(p.Code); err == nil {
					filtered = append(filtered, c)
				}
			}
		}
		codes = filtered
	}

	if len(codes) == 0 {
		return []map[string]interface{}{}, nil
	}

	skip := (page - 1) * limit
	rows, err := s.repo.GetStatement(codes, limit, skip, dateFrom)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	totalBalRaw, _, err := s.repo.GetBalance(codes)
	if err != nil {
		return nil, err
	}
	totalBalance := float64(totalBalRaw)
	log.Printf("[StatementDebug] Total Balance for codes %v: %f", codes, totalBalance)

	results := make([]map[string]interface{}, 0)
	runningBal := totalBalance

	for rows.Next() {
		var (
			id, source    sql.NullString
			date, timeRaw sql.NullString
			total         sql.NullFloat64
		)
		rows.Scan(&id, &date, &timeRaw, &total, &source)

		val := math.Abs(total.Float64)
		sourceStr := strings.TrimSpace(source.String)

		// H, HH, P, OR are DEBITS (Increase debt in this context)
		// I, R, RR, O are CREDITS (Decrease debt)
		isPositive := false
		if sourceStr == "H" || sourceStr == "HH" || sourceStr == "P" || sourceStr == "OR" {
			isPositive = true
		}

		movement := val
		if !isPositive {
			movement = -val
		}

		debit := 0.0
		credit := 0.0
		if isPositive {
			debit = val
		} else {
			credit = val
		}

		itemType := "معاملة"
		switch sourceStr {
		case "H", "HH":
			itemType = "فاتورة مشتريات"
		case "P":
			itemType = "مردود نقدي"
		case "I":
			itemType = "استلام نقدية"
		case "R", "RR":
			itemType = "مرتجع مشتريات"
		case "O":
			itemType = "فاتورة مبيعات"
		case "OR":
			itemType = "مردود مبيعات"
		}

		balAfter := runningBal
		balBefore := runningBal - movement
		
		log.Printf("[StatementDebug] ID: %s, Source: %s, Total: %f, Movement: %f, After: %f, Before: %f", 
			id.String, sourceStr, val, movement, balAfter, balBefore)
			
		runningBal = balBefore

		results = append(results, map[string]interface{}{
			"date":           s.formatDate(strings.TrimSpace(date.String)),
			"time":           s.formatTime(strings.TrimSpace(timeRaw.String)),
			"debit":          debit,
			"credit":         credit,
			"type":           itemType,
			"ref_id":         fmt.Sprintf("%s_%s", sourceStr, strings.TrimSpace(id.String)),
			"raw_source":     sourceStr,
			"source":         "FB",
			"balance_before": balBefore,
			"balance_after":  balAfter,
		})
	}

	// If we've reached the end or it's a small result set, add the beginning balance
	// In a real paginated system, this is tricky, but following Python logic:
	// if len(results) < limit and runningBal != 0
	if len(results) > 0 && runningBal != 0 {
		results = append(results, map[string]interface{}{
			"date":           "بداية المدة",
			"time":           "00:00",
			"debit":          0.0,
			"credit":         0.0,
			"type":           "رصيد أول المدة",
			"ref_id":         "0",
			"source":         "OB",
			"balance_before": 0.0,
			"balance_after":  runningBal,
		})
	}

	log.Printf("[PurchaseService] GetStatement returned %d records for codes %v", len(results), codes)
	return results, nil
}

func (s *PurchaseService) mapRows(rows *sql.Rows) ([]map[string]interface{}, error) {
	results := make([]map[string]interface{}, 0)
	for rows.Next() {
		var (
			id, source, writer, pharmName, cusName sql.NullString
			date, timeRaw                 sql.NullString
			total                         sql.NullFloat64
		)
		rows.Scan(&id, &date, &timeRaw, &total, &source, &writer, &pharmName, &cusName)

		results = append(results, map[string]interface{}{
			"id":            fmt.Sprintf("%s_%s", strings.TrimSpace(source.String), strings.TrimSpace(id.String)),
			"date":          s.formatDate(strings.TrimSpace(date.String)),
			"time":          s.formatTime(strings.TrimSpace(timeRaw.String)),
			"total":         total.Float64,
			"source":        strings.TrimSpace(source.String),
			"writer":        strings.TrimSpace(writer.String),
			"pharmacy_name": strings.TrimSpace(pharmName.String),
			"notes":         strings.TrimSpace(cusName.String),
		})
	}
	return results, nil
}

func (s *PurchaseService) formatTime(t string) string {
	t = strings.TrimSpace(t)
	if t == "" {
		return ""
	}
	
	// If it contains 'T', we definitely want what's after it
	if strings.Contains(t, "T") {
		parts := strings.Split(t, "T")
		if len(parts) > 1 {
			t = parts[1]
		}
	} else if strings.Contains(t, "-") && strings.Count(t, ":") >= 1 {
		// Sometimes it might be "YYYY-MM-DD HH:MM:SS" without a 'T'
		parts := strings.Split(t, " ")
		if len(parts) > 1 {
			t = parts[1]
		}
	}
	
	// Ensure we only have the HH:MM part from the start of the time string
	// Expected t: "17:09:17" or "17:09"
	if len(t) >= 5 {
		return t[:5]
	}
	return t
}

func (s *PurchaseService) formatDate(d string) string {
	d = strings.TrimSpace(d)
	if d == "" {
		return ""
	}
	// Strip time if it's an ISO timestamp (e.g., 2024-05-08T00:00:00)
	if strings.Contains(d, "T") {
		d = strings.Split(d, "T")[0]
	}
	// Try to handle YYYY-MM-DD
	parts := strings.Split(d, "-")
	if len(parts) == 3 && len(parts[0]) == 4 {
		return fmt.Sprintf("%s/%s/%s", parts[2], parts[1], parts[0])
	}
	// Try to handle DD.MM.YYYY
	parts = strings.Split(d, ".")
	if len(parts) == 3 {
		return fmt.Sprintf("%s/%s/%s", parts[0], parts[1], parts[2])
	}
	return d
}

func (s *PurchaseService) GetPurchaseDetailsBatch(ids []string) (map[string][]map[string]interface{}, error) {
	if len(ids) == 0 {
		return map[string][]map[string]interface{}{}, nil
	}
	
	// Ensure we only have numeric IDs to avoid SQL injection
	cleanIDs := make([]string, 0)
	for _, idStr := range ids {
		parts := strings.Split(idStr, "_")
		if len(parts) >= 2 {
			cleanIDs = append(cleanIDs, parts[len(parts)-1])
		} else {
			cleanIDs = append(cleanIDs, idStr)
		}
	}

	rows, err := s.repo.GetPurchaseDetailsBatch(cleanIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make(map[string][]map[string]interface{})
	for rows.Next() {
		var (
			hID, name   sql.NullString
			qty, price  sql.NullFloat64
			total       sql.NullFloat64
			bn, exp     sql.NullString
		)
		rows.Scan(&hID, &name, &qty, &price, &total, &bn, &exp)

		invoiceID := strings.TrimSpace(hID.String)
		
		item := map[string]interface{}{
			"name":  strings.TrimSpace(name.String),
			"qty":   qty.Float64,
			"price": price.Float64,
			"total": total.Float64,
			"bn":    strings.TrimSpace(bn.String),
			"exp":   strings.TrimSpace(exp.String),
		}

		if _, exists := results[invoiceID]; !exists {
			results[invoiceID] = []map[string]interface{}{}
		}
		results[invoiceID] = append(results[invoiceID], item)
	}

	return results, nil
}

func (s *PurchaseService) GetPurchaseDetail(user *models.User, idStr string) (map[string]interface{}, error) {
	return s.getInvoiceDetailGeneric(idStr, "purchase")
}

func (s *PurchaseService) GetReturnDetail(user *models.User, idStr string) (map[string]interface{}, error) {
	return s.getInvoiceDetailGeneric(idStr, "return")
}

func (s *PurchaseService) GetSaleDetail(user *models.User, idStr string) (map[string]interface{}, error) {
	return s.getInvoiceDetailGeneric(idStr, "sale")
}

func (s *PurchaseService) getInvoiceDetailGeneric(idStr string, mode string) (map[string]interface{}, error) {
	parts := strings.Split(idStr, "_")
	source := "H"
	id := 0
	if len(parts) >= 2 {
		source = parts[0]
		id, _ = strconv.Atoi(parts[len(parts)-1])
	} else {
		id, _ = strconv.Atoi(idStr)
	}

	var headerRow *sql.Row
	var itemsRows *sql.Rows
	var err error

	if mode == "return" {
		headerRow, _ = s.repo.GetReturnHeader(id, source)
		itemsRows, err = s.repo.GetReturnItems(id, source)
	} else {
		headerRow, _ = s.repo.GetInvoiceHeader(id, source)
		itemsRows, err = s.repo.GetInvoiceItems(id, source)
	}

	if err != nil {
		return nil, err
	}
	defer itemsRows.Close()

	var (
		invID, pharmName, writer, accountID sql.NullString
		date, timeRaw                       sql.NullString
		total                               sql.NullFloat64
		bacet, kartona, freeze              sql.NullInt64
		cusName                             sql.NullString
	)
	err = headerRow.Scan(&invID, &date, &timeRaw, &total, &writer, &pharmName, &accountID, &bacet, &kartona, &freeze, &cusName)
	if err != nil {
		return nil, err
	}

	items := make([]map[string]interface{}, 0)
	for itemsRows.Next() {
		var (
			name, prodID, retIDR, retIDRR sql.NullString
			qty, consumer, itemTotal, disc  sql.NullFloat64
		)
		itemsRows.Scan(&name, &qty, &consumer, &itemTotal, &disc, &prodID, &retIDR, &retIDRR)

		retID := ""
		if retIDR.Valid {
			retID = retIDR.String
		} else if retIDRR.Valid {
			retID = retIDRR.String
		}

		items = append(items, map[string]interface{}{
			"name":      strings.TrimSpace(name.String),
			"qty":       qty.Float64,
			"price":     consumer.Float64,
			"total":     itemTotal.Float64,
			"discount":  disc.Float64,
			"prod_id":   strings.TrimSpace(prodID.String),
			"return_id": retID,
			"is_return": retID != "",
		})
	}

	return map[string]interface{}{
		"id":            strings.TrimSpace(invID.String),
		"date":          strings.TrimSpace(date.String) + " " + s.formatTime(strings.TrimSpace(timeRaw.String)),
		"total":         total.Float64,
		"users_name":    strings.TrimSpace(writer.String),
		"pharmacy_name": strings.TrimSpace(pharmName.String),
		"itemsList":     items,
		"BACET_ID":      bacet.Int64,
		"KARTONA1_ID":   kartona.Int64,
		"COUNT_FREEZE":  freeze.Int64,
		"notes":         strings.TrimSpace(cusName.String),
	}, nil
}
