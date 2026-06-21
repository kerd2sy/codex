package pharmacy

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"tabarak-pharma-backend/internal/features/pharmacy/repositories"
	"tabarak-pharma-backend/internal/models"
)

type OrderService struct {
	repo         *repositories.OrderRepository
	pharmacyRepo *repositories.PharmacyRepository
}

func NewOrderService() *OrderService {
	return &OrderService{
		repo:         repositories.NewOrderRepository(),
		pharmacyRepo: repositories.NewPharmacyRepository(),
	}
}

func (s *OrderService) GetMyOrders(user *models.User, pharmacyID string, page, limit int, sort string) ([]map[string]interface{}, error) {
	var codes []int
	
	// Filter if pharmacyID is provided
	if pharmacyID != "" && pharmacyID != "0" {
		id, _ := strconv.Atoi(pharmacyID)
		for _, p := range user.Pharmacies {
			if int(p.ID) == id {
				if c, err := strconv.Atoi(p.Code); err == nil {
					codes = append(codes, c)
				}
			}
		}
		// If ID provided but not found/accessible, return empty
		if len(codes) == 0 {
			return []map[string]interface{}{}, nil
		}
	} else {
		codes = s.pharmacyRepo.GetCleanPharmaCodes(user)
	}

	if len(codes) == 0 {
		return []map[string]interface{}{}, nil
	}

	skip := (page - 1) * limit
	rows, err := s.repo.GetPurchaseOrders(codes, limit, skip, sort)
	if err != nil {
		if err == sql.ErrNoRows {
			return []map[string]interface{}{}, nil
		}
		return nil, err
	}
	defer rows.Close()

	results := make([]map[string]interface{}, 0)
	for rows.Next() {
		var (
			oID, pharmaName, writerName, source, bacet, kartona, freeze sql.NullString
			dateD, timeT, sIn, sUp, sOut                                 sql.NullString
			total                                                        sql.NullFloat64
			count, isClose, accountID                                    sql.NullInt64
		)
		rows.Scan(&oID, &dateD, &timeT, &sIn, &sUp, &sOut, &total, &count, &pharmaName, &writerName, &isClose, &source, &bacet, &kartona, &freeze, &accountID)

		// Calculate step
		step := 1
		if sOut.Valid && len(sOut.String) > 2 {
			step = 5
		} else if sUp.Valid && len(sUp.String) > 2 {
			step = 4
		} else if sIn.Valid && len(sIn.String) > 2 {
			step = 3
		} else if isClose.Valid && isClose.Int64 != 0 {
			step = 2
		}

		results = append(results, map[string]interface{}{
			"id":          fmt.Sprintf("%s_%s", source.String, oID.String),
			"supplier":    pharmaName.String,
			"category":    "مشتريات",
			"price":       total.Float64,
			"date":        s.formatDate(dateD.String),
			"time":        s.formatTime(timeT.String),
			"items":       count.Int64,
			"currentStep": step,
			"writer":      writerName.String,
			"BACET_ID":    bacet.String,
			"KARTONA1_ID": kartona.String,
			"COUNT_FREEZE": freeze.String,
			"pharmacy_id": accountID.Int64, // Explicitly return for frontend filtering
		})
	}
	return results, nil
}

func (s *OrderService) GetMySales(user *models.User, pharmacyID string, page, limit int, sort string) ([]map[string]interface{}, error) {
	var codes []int
	
	// Filter if pharmacyID is provided
	if pharmacyID != "" && pharmacyID != "0" {
		id, _ := strconv.Atoi(pharmacyID)
		for _, p := range user.Pharmacies {
			if int(p.ID) == id {
				if c, err := strconv.Atoi(p.Code); err == nil {
					codes = append(codes, c)
				}
			}
		}
		if len(codes) == 0 {
			return []map[string]interface{}{}, nil
		}
	} else {
		codes = s.pharmacyRepo.GetCleanPharmaCodes(user)
	}

	if len(codes) == 0 {
		return []map[string]interface{}{}, nil
	}

	skip := (page - 1) * limit
	rows, err := s.repo.GetSalesOrders(codes, limit, skip, sort)
	if err != nil {
		if err == sql.ErrNoRows {
			return []map[string]interface{}{}, nil
		}
		return nil, err
	}
	defer rows.Close()

	results := make([]map[string]interface{}, 0)
	for rows.Next() {
		var (
			oID, dateD, timeT, pharmaName, userName sql.NullString
			total                                    sql.NullFloat64
			count, accountID                         sql.NullInt64
		)
		rows.Scan(&oID, &dateD, &timeT, &total, &count, &pharmaName, &userName, &accountID)

		results = append(results, map[string]interface{}{
			"id":          fmt.Sprintf("O_%s", oID.String),
			"supplier":    pharmaName.String,
			"category":    "مبيعات",
			"price":       total.Float64,
			"date":        s.formatDate(dateD.String),
			"time":        s.formatTime(timeT.String),
			"items":       count.Int64,
			"currentStep": 1,
			"writer":      userName.String,
			"pharmacy_id": accountID.Int64,
		})
	}
	return results, nil
}
func (s *OrderService) formatTime(t string) string {
	t = strings.TrimSpace(t)
	if t == "" {
		return ""
	}
	if strings.Contains(t, "T") {
		parts := strings.Split(t, "T")
		if len(parts) > 1 {
			t = parts[1]
		}
	}
	if len(t) >= 5 {
		return t[:5]
	}
	return t
}

func (s *OrderService) formatDate(d string) string {
	d = strings.TrimSpace(d)
	if d == "" {
		return ""
	}
	if strings.Contains(d, "T") {
		d = strings.Split(d, "T")[0]
	}
	parts := strings.Split(d, "-")
	if len(parts) == 3 && len(parts[0]) == 4 {
		return fmt.Sprintf("%s/%s/%s", parts[2], parts[1], parts[0])
	}
	parts = strings.Split(d, ".")
	if len(parts) == 3 {
		return fmt.Sprintf("%s/%s/%s", parts[0], parts[1], parts[2])
	}
	return d
}
