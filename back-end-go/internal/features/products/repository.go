package products

import (
	"database/sql"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

type ProductRepository struct {
	pg *gorm.DB
	fb *sql.DB
}

func NewProductRepository() *ProductRepository {
	return &ProductRepository{
		pg: db.DB,
		fb: db.FB,
	}
}

func NormalizeArabic(s string) string {
	s = strings.ReplaceAll(s, "أ", "ا")
	s = strings.ReplaceAll(s, "إ", "ا")
	s = strings.ReplaceAll(s, "آ", "ا")
	s = strings.ReplaceAll(s, "ة", "ه")
	s = strings.ReplaceAll(s, "ى", "ي")
	return strings.ToLower(strings.TrimSpace(s))
}

func (r *ProductRepository) SearchProducts(search string, limit int, kind int) ([]map[string]interface{}, error) {
	whereClause := "WHERE 1=1"
	params := []interface{}{limit}

	if search != "" {
		searchClean := strings.TrimSpace(search)
		searchNorm := NormalizeArabic(searchClean)
		
		re := regexp.MustCompile(`[^\w\s]`)
		searchAlphaNum := re.ReplaceAllString(searchNorm, " ")
		
		keywords := strings.Fields(searchAlphaNum)
		var nameConds []string
		for _, kw := range keywords {
			if len(kw) >= 2 {
				nameConds = append(nameConds, "P.PROD_NAME CONTAINING ?")
				params = append(params, kw)
			}
		}

		nameMatch := "1=0"
		if len(nameConds) > 0 {
			nameMatch = "(" + strings.Join(nameConds, " AND ") + ")"
		}

		otherConds := []string{
			"P.BARCODE = ?", "P.BARCODE_U = ?",
			"P.BARCODE CONTAINING ?", "P.BARCODE_U CONTAINING ?",
		}
		params = append(params, searchClean, searchClean, searchClean, searchClean)

		if matched, _ := regexp.MatchString(`^\d+$`, searchClean); matched {
			val, _ := strconv.Atoi(searchClean)
			otherConds = append(otherConds, "P.PROD_ID = ?", "P.BAR_CODE = ?")
			params = append(params, val, val)
		}

		whereClause += fmt.Sprintf(" AND (%s OR %s)", nameMatch, strings.Join(otherConds, " OR "))
		
		// Update the FIRST parameter
		newLimit := limit * 3
		if newLimit < 50 {
			newLimit = 50
		}
		params[0] = newLimit
	}

	query := fmt.Sprintf(`
		SELECT FIRST ? P.PROD_ID, MAX(P.PROD_NAME), MAX(P.CONSUMER), SUM(SS.TOTAL_QTY_ALL),
			   MAX(P.DISCOUNT_A_1), MAX(P.DISCOUNT_A_2), MAX(P.DISCOUNT_B_1), MAX(P.DISCOUNT_B_2),
			   MAX(P.DISCOUNT_C_1), MAX(P.DISCOUNT_C_2), MAX(P.DISCOUNT_D_1), MAX(P.DISCOUNT_D_2),
			   MAX(P.DISCOUNT_F_1), MAX(P.DISCOUNT_F_2)
		FROM PRODUCTS P LEFT JOIN STOCK_STOCK SS ON P.PROD_ID = SS.PROD_ID %s
		GROUP BY P.PROD_ID ORDER BY 2 ASC
	`, whereClause)

	rows, err := r.fb.Query(query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]map[string]interface{}, 0)
	for rows.Next() {
		var (
			id, name sql.NullString
			cons, qty sql.NullFloat64
			da1, da2, db1, db2, dc1, dc2, dd1, dd2, df1, df2 sql.NullFloat64
		)
		err := rows.Scan(&id, &name, &cons, &qty, &da1, &da2, &db1, &db2, &dc1, &dc2, &dd1, &dd2, &df1, &df2)
		if err != nil {
			continue
		}

		matrices := map[string][2]float64{
			"list":       getTierVal(da1.Float64, da2.Float64),
			"pharmacies": getTierVal(db1.Float64, db2.Float64),
			"wholesale":  getTierVal(dc1.Float64, dc2.Float64),
			"reps":       getTierVal(dd1.Float64, dd2.Float64),
			"companies":  getTierVal(df1.Float64, df2.Float64),
		}

		activeD, activeD2 := applyDiscountMask(kind, matrices)

		results = append(results, map[string]interface{}{
			"id":               id.String,
			"name":             strings.TrimSpace(name.String),
			"price":            cons.Float64,
			"qty":              int(qty.Float64),
			"discount_percent": activeD,
			"disc_p":           activeD,
			"disc_p2":          activeD2,
			"_score":           1.0,
		})
	}

	if len(results) > limit {
		results = results[:limit]
	}

	return results, nil
}

func (r *ProductRepository) GetHistory(userID uint, limit int) ([]models.ProductSearchHistory, error) {
	var history []models.ProductSearchHistory
	err := r.pg.Where("user_id = ?", userID).Order("created_at desc").Limit(limit).Find(&history).Error
	return history, err
}

func (r *ProductRepository) AddHistory(userID uint, query string) error {
	var existing models.ProductSearchHistory
	if err := r.pg.Where("user_id = ? AND query = ?", userID, query).First(&existing).Error; err == nil {
		existing.CreatedAt = time.Now()
		return r.pg.Save(&existing).Error
	}

	newHistory := models.ProductSearchHistory{
		UserID: userID,
		Query:  query,
	}
	return r.pg.Create(&newHistory).Error
}

func (r *ProductRepository) ClearHistory(userID uint) error {
	return r.pg.Where("user_id = ?", userID).Delete(&models.ProductSearchHistory{}).Error
}

func (r *ProductRepository) GetRecent(limit int, kind int) ([]map[string]interface{}, error) {
	query := `
		SELECT FIRST ? P.PROD_ID, P.PROD_NAME, P.CONSUMER, SS.TOTAL_QTY_ALL,
			   P.DISCOUNT_A_1, P.DISCOUNT_A_2, P.DISCOUNT_B_1, P.DISCOUNT_B_2,
			   P.DISCOUNT_C_1, P.DISCOUNT_C_2, P.DISCOUNT_D_1, P.DISCOUNT_D_2,
			   P.DISCOUNT_F_1, P.DISCOUNT_F_2
		FROM STOCK_STOCK SS
		JOIN PRODUCTS P ON SS.PROD_ID = P.PROD_ID
		WHERE SS.DATE_IN = CURRENT_DATE
		AND SS.STORE_ID = 1
		AND SS.TOTAL_QTY_ALL > 0
		ORDER BY SS.STOCK_ID DESC
	`

	rows, err := r.fb.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]map[string]interface{}, 0)
	for rows.Next() {
		var (
			id, name sql.NullString
			cons, qty sql.NullFloat64
			da1, da2, db1, db2, dc1, dc2, dd1, dd2, df1, df2 sql.NullFloat64
		)
		err := rows.Scan(&id, &name, &cons, &qty, &da1, &da2, &db1, &db2, &dc1, &dc2, &dd1, &dd2, &df1, &df2)
		if err != nil {
			continue
		}

		matrices := map[string][2]float64{
			"list":       getTierVal(da1.Float64, da2.Float64),
			"pharmacies": getTierVal(db1.Float64, db2.Float64),
			"wholesale":  getTierVal(dc1.Float64, dc2.Float64),
			"reps":       getTierVal(dd1.Float64, dd2.Float64),
			"companies":  getTierVal(df1.Float64, df2.Float64),
		}

		activeD, activeD2 := applyDiscountMask(kind, matrices)

		results = append(results, map[string]interface{}{
			"id":               id.String,
			"name":             strings.TrimSpace(name.String),
			"price":            cons.Float64,
			"qty":              int(qty.Float64),
			"discount_percent": activeD,
			"disc_p":           activeD,
			"disc_p2":          activeD2,
		})
	}

	return results, nil
}

// Helpers
func getTierVal(t1, t2 float64) [2]float64 {
	if t2 > 0 {
		return [2]float64{t1, t2}
	}
	return [2]float64{t1, t1}
}

func applyDiscountMask(kind int, matrices map[string][2]float64) (float64, float64) {
	var vals [2]float64
	switch kind {
	case 2:
		vals = matrices["wholesale"]
	case 3:
		vals = matrices["companies"]
	case 1:
		vals = matrices["list"]
	case 5:
		vals = matrices["reps"]
	default:
		vals = matrices["pharmacies"]
	}
	return vals[0], vals[1]
}
