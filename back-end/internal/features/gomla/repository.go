package gomla

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"tabarak-pharma-backend/internal/db"
	"unicode/utf8"

	"github.com/shopspring/decimal"
	"golang.org/x/text/encoding/charmap"
)

type GomlaRepository struct{}

func NewGomlaRepository() *GomlaRepository {
	return &GomlaRepository{}
}

func (r *GomlaRepository) GetInvoiceDetails(id int) (*sql.Row, *sql.Rows, error) {
	headerRow := db.FB.QueryRow(`
		SELECT H.INVOICES_H_ID, H.DATE_D, H.TIME_T, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION), H.USERS_NAME, A.ACCOUNT_NAME, H.ACCOUNT_ID
		FROM INVOICES_H H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE H.INVOICES_H_ID = ? AND H.STORE_ID = 3
	`, id)

	itemsRows, err := db.FB.Query(`
		SELECT D.INVOICES_D_ID, P.PROD_NAME, D.TOTAL_QTY_ALL, CAST(D.CONSUMER AS DOUBLE PRECISION), 
		       CAST(D.TOTAL_TOTAL AS DOUBLE PRECISION), D.PROD_ID,
		       D.PROD_SN_NO, D.EXPIRE_DATE, COALESCE(P.BARCODE, P.BARCODE_U) AS BARCODE, D.COMPUTER_LAST,
		       P.POIS_ALL, D.USERS_LAST
		FROM INVOICES_D D
		JOIN PRODUCTS P ON D.PROD_ID = P.PROD_ID
		WHERE D.INVOICES_H_ID = ?
	`, id)

	return headerRow, itemsRows, err
}

func (r *GomlaRepository) GetProductStockBalance(prodID string) ([]map[string]interface{}, error) {
	query := `
		SELECT SS.STORE_ID, CAST(SS.TOTAL_QTY_ALL AS DOUBLE PRECISION)
		FROM STOCK_STOCK SS
		WHERE SS.PROD_ID = ? AND SS.TOTAL_QTY_ALL > 0
		ORDER BY SS.STORE_ID ASC
	`
	rows, err := db.FB.Query(query, prodID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var balances []map[string]interface{}
	for rows.Next() {
		var storeID int
		var qty float64
		if err := rows.Scan(&storeID, &qty); err != nil {
			continue
		}
		
		storeName := "مخزن " + strconv.Itoa(storeID)
		if storeID == 1 {
			storeName = "المخزن الرئيسي"
		} else if storeID == 2 {
			storeName = "مخزن الجملة"
		} else if storeID == 3 {
			storeName = "جملة الجملة"
		}
		
		balances = append(balances, map[string]interface{}{
			"store_id":   storeID,
			"store_name": storeName,
			"qty":        qty,
		})
	}
	return balances, nil
}

func (r *GomlaRepository) GetRecentInvoices(limit int, dateStr string) (*sql.Rows, error) {
	if dateStr != "" {
		return db.FB.Query(`
			SELECT FIRST ? H.INVOICES_H_ID, H.DATE_D, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION), A.ACCOUNT_NAME,
				(SELECT COUNT(INVOICES_D_ID) FROM INVOICES_D D WHERE D.INVOICES_H_ID = H.INVOICES_H_ID) as TOTAL_ITEMS,
				(SELECT COUNT(INVOICES_D_ID) FROM INVOICES_D D WHERE D.INVOICES_H_ID = H.INVOICES_H_ID AND D.COMPUTER_LAST = 'APP_AUDIT') as AUDITED_ITEMS
			FROM INVOICES_H H
			LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
			WHERE H.STORE_ID = 3 AND H.DATE_D = ?
			ORDER BY H.INVOICES_H_ID DESC
		`, limit, dateStr)
	}

	return db.FB.Query(`
		SELECT FIRST ? H.INVOICES_H_ID, H.DATE_D, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION), A.ACCOUNT_NAME,
			(SELECT COUNT(INVOICES_D_ID) FROM INVOICES_D D WHERE D.INVOICES_H_ID = H.INVOICES_H_ID) as TOTAL_ITEMS,
			(SELECT COUNT(INVOICES_D_ID) FROM INVOICES_D D WHERE D.INVOICES_H_ID = H.INVOICES_H_ID AND D.COMPUTER_LAST = 'APP_AUDIT') as AUDITED_ITEMS
		FROM INVOICES_H H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE H.STORE_ID = 3 AND H.DATE_D >= CURRENT_DATE - 1
		ORDER BY H.INVOICES_H_ID DESC
	`, limit)
}


func (r *GomlaRepository) GetTodayInvoices() (*sql.Rows, error) {
	return db.FB.Query(`
		SELECT H.INVOICES_H_ID, H.DATE_D, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION), A.ACCOUNT_NAME,
			(SELECT COUNT(INVOICES_D_ID) FROM INVOICES_D D WHERE D.INVOICES_H_ID = H.INVOICES_H_ID) as TOTAL_ITEMS,
			(SELECT COUNT(INVOICES_D_ID) FROM INVOICES_D D WHERE D.INVOICES_H_ID = H.INVOICES_H_ID AND D.COMPUTER_LAST = 'APP_AUDIT') as AUDITED_ITEMS
		FROM INVOICES_H H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE H.STORE_ID = 3
		  AND H.DATE_D = CURRENT_DATE
		ORDER BY H.INVOICES_H_ID DESC
	`)
}

func toFloat64(val interface{}) (float64, bool) {
	if val == nil {
		return 0, false
	}
	switch v := val.(type) {
	case decimal.Decimal:
		f, _ := v.Float64()
		return f, true
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int64:
		return float64(v), true
	case int32:
		return float64(v), true
	case int16:
		return float64(v), true
	case int8:
		return float64(v), true
	case int:
		return float64(v), true
	case uint64:
		return float64(v), true
	case uint32:
		return float64(v), true
	case uint16:
		return float64(v), true
	case uint8:
		return float64(v), true
	case uint:
		return float64(v), true
	case string:
		var f float64
		_, err := fmt.Sscanf(v, "%f", &f)
		if err == nil {
			return f, true
		}
	case []byte:
		var f float64
		_, err := fmt.Sscanf(string(v), "%f", &f)
		if err == nil {
			return f, true
		}
	}
	return 0, false
}

func toInt64(val interface{}) (int64, bool) {
	if val == nil {
		return 0, false
	}
	switch v := val.(type) {
	case decimal.Decimal:
		return v.IntPart(), true
	case float64:
		return int64(v), true
	case float32:
		return int64(v), true
	case int64:
		return v, true
	case int32:
		return int64(v), true
	case int16:
		return int64(v), true
	case int8:
		return int64(v), true
	case int:
		return int64(v), true
	case uint64:
		return int64(v), true
	case uint32:
		return int64(v), true
	case uint16:
		return int64(v), true
	case uint8:
		return int64(v), true
	case uint:
		return int64(v), true
	case string:
		var i int64
		_, err := fmt.Sscanf(v, "%d", &i)
		if err == nil {
			return i, true
		}
	case []byte:
		var i int64
		_, err := fmt.Sscanf(string(v), "%d", &i)
		if err == nil {
			return i, true
		}
	}
	return 0, false
}

var gomlaUpdateMutex sync.Mutex

func (r *GomlaRepository) SplitOrUpdateItem(dID int, batch string, expiry string, auditQty float64, userName string) (int, error) {
	gomlaUpdateMutex.Lock()
	defer gomlaUpdateMutex.Unlock()

	tx, err := db.FB.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Query all columns of the original row to duplicate it dynamically
	rows, err := tx.Query("SELECT * FROM INVOICES_D WHERE INVOICES_D_ID = ?", dID)
	if err != nil {
		return 0, err
	}
	cols, err := rows.Columns()
	if err != nil {
		rows.Close()
		return 0, err
	}

	colTypes, err := rows.ColumnTypes()
	if err != nil {
		rows.Close()
		return 0, err
	}

	typeMap := make(map[string]string)
	for _, ct := range colTypes {
		typeMap[strings.ToUpper(ct.Name())] = ct.DatabaseTypeName()
	}

	if !rows.Next() {
		rows.Close()
		return 0, fmt.Errorf("item not found")
	}

	// Prepare interface slices for dynamic scanning
	values := make([]interface{}, len(cols))
	valuePtrs := make([]interface{}, len(cols))
	for i := range cols {
		valuePtrs[i] = &values[i]
	}

	err = rows.Scan(valuePtrs...)
	rows.Close()
	if err != nil {
		return 0, err
	}

	// Map columns to their scanned values (using case-insensitive lookup)
	colMap := make(map[string]interface{})
	for i, col := range cols {
		colMap[strings.ToUpper(col)] = values[i]
	}

	// Retrieve total quantity and consumer price using robust toFloat64 converter
	totalQty, ok := toFloat64(colMap["TOTAL_QTY_ALL"])
	if !ok {
		totalQty = 0
	}

	consumerPrice, ok := toFloat64(colMap["CONSUMER"])
	if !ok {
		consumerPrice = 0
	}

	originalCost, ok := toFloat64(colMap["COST"])
	if !ok {
		originalCost = 0
	}

	originalTotalTotal, ok := toFloat64(colMap["TOTAL_TOTAL"])
	if !ok {
		originalTotalTotal = 0
	}

	originalQtyQty, ok := toFloat64(colMap["QTY_QTY"])
	if !ok {
		originalQtyQty = totalQty
	}

	originalBonus, ok := toFloat64(colMap["BONUS"])
	if !ok {
		originalBonus = 0
	}

	hID, ok := toInt64(colMap["INVOICES_H_ID"])
	if !ok {
		return 0, fmt.Errorf("failed to get INVOICES_H_ID from item columns")
	}

	// Fetch current CLOSE_ value of the header
	var originalClose sql.NullInt64
	err = tx.QueryRow("SELECT CLOSE_ FROM INVOICES_H WHERE INVOICES_H_ID = ?", hID).Scan(&originalClose)
	if err != nil {
		return 0, fmt.Errorf("failed to query CLOSE_ from INVOICES_H: %w", err)
	}

	// If closed, temporarily open it within transaction
	isClosed := originalClose.Valid && originalClose.Int64 == 1
	if isClosed {
		_, err = tx.Exec("UPDATE INVOICES_H SET CLOSE_ = 0 WHERE INVOICES_H_ID = ?", hID)
		if err != nil {
			return 0, fmt.Errorf("failed to temporarily open invoice header: %w", err)
		}
	}

	disc1, _ := toFloat64(colMap["DISCOUNT1"])
	discM, _ := toFloat64(colMap["DISCOUNT_M"])
	discCost, _ := toFloat64(colMap["DISCOUNT_COST"])
	discAA, _ := toFloat64(colMap["DISCOUNT_AA"])
	totalSS, _ := toFloat64(colMap["TOTAL_SS"])
	prodID, _ := toInt64(colMap["PROD_ID"])

	// The Firebird trigger INVOICES_D_BIU0 zeroes out S_S (FFFFF) by querying OFF_DIS from PRODUCTS on UPDATE.
	// To bypass this and preserve S_S to equal DISCOUNT1, we must temporarily update OFF_DIS in PRODUCTS, then restore it!
	var currentOffDis float64
	err = tx.QueryRow("SELECT OFF_DIS FROM PRODUCTS WHERE PROD_ID = ?", prodID).Scan(&currentOffDis)
	if err != nil {
		currentOffDis = 0
	}
	_, _ = tx.Exec("UPDATE PRODUCTS SET OFF_DIS = ? WHERE PROD_ID = ?", disc1, prodID)

	if auditQty <= 0 || auditQty >= totalQty {
		// Just standard update, no split needed!
		batchBytes := encodeToWindows1256(truncateToBytes(batch, 20))
		userNameBytes := encodeToWindows1256(truncateToBytes(userName, 25))

		_, err = tx.Exec(`
			UPDATE INVOICES_D 
			SET PROD_SN_NO = ?, EXPIRE_DATE = ?, COMPUTER_LAST = 'APP_AUDIT', USERS_LAST = ?,
			    DISCOUNT1 = ?, DISCOUNT_M = ?, DISCOUNT_COST = ?, DISCOUNT_AA = ?,
			    TOTAL_SS = ?
			WHERE INVOICES_D_ID = ?
		`, batchBytes, expiry, userNameBytes, disc1, discM, discCost, discAA, totalSS, dID)
		
		// Restore OFF_DIS in PRODUCTS
		_, _ = tx.Exec("UPDATE PRODUCTS SET OFF_DIS = ? WHERE PROD_ID = ?", currentOffDis, prodID)
		
		if err != nil {
			return 0, err
		}

		// Restore CLOSE_ = 1 on the header if it was originally closed
		if isClosed {
			_, err = tx.Exec("UPDATE INVOICES_H SET CLOSE_ = 1 WHERE INVOICES_H_ID = ?", hID)
			if err != nil {
				return 0, fmt.Errorf("failed to restore CLOSE_ status: %w", err)
			}
		}

		return int(hID), tx.Commit()
	}

	// Otherwise, split the row!
	remainingQty := totalQty - auditQty

	costToUse := originalCost
	if costToUse == 0 {
		costToUse = 0.00001
	}

	batchBytes := encodeToWindows1256(truncateToBytes(batch, 20))
	userNameBytes := encodeToWindows1256(truncateToBytes(userName, 25))
	auditedQtyQty := originalQtyQty * (auditQty / totalQty)
	auditedBonus := originalBonus * (auditQty / totalQty)
	auditedTotalSS := totalSS * (auditQty / totalQty)

	// 1. Update the original row with audited quantity, batch, and expiry
	_, err = tx.Exec(`
		UPDATE INVOICES_D 
		SET TOTAL_QTY_ALL = ?, QTY_QTY = ?, BONUS = ?, PROD_SN_NO = ?, EXPIRE_DATE = ?, COMPUTER_LAST = 'APP_AUDIT', USERS_LAST = ?,
		    DISCOUNT1 = ?, DISCOUNT_M = ?, DISCOUNT_COST = ?, DISCOUNT_AA = ?,
		    TOTAL_SS = ?
		WHERE INVOICES_D_ID = ?
	`, auditQty, auditedQtyQty, auditedBonus, batchBytes, expiry, userNameBytes, disc1, discM, discCost, discAA, auditedTotalSS, dID)
	
	// Restore OFF_DIS in PRODUCTS
	_, _ = tx.Exec("UPDATE PRODUCTS SET OFF_DIS = ? WHERE PROD_ID = ?", currentOffDis, prodID)
	
	if err != nil {
		return 0, err
	}

	// 2. Insert the duplicate row for the remaining quantity
	var insertCols []string
	var insertPlaceholders []string
	var insertValues []interface{}

	for _, col := range cols {
		upperCol := strings.ToUpper(col)
		if upperCol == "INVOICES_D_ID" {
			continue // primary key auto-incremented by trigger
		}
		insertCols = append(insertCols, col)
		insertPlaceholders = append(insertPlaceholders, "?")

		var val interface{}
		switch upperCol {
		case "TOTAL_QTY_ALL":
			val = remainingQty
		case "QTY_QTY":
			val = originalQtyQty * (remainingQty / totalQty)
		case "BONUS":
			val = originalBonus * (remainingQty / totalQty)
		case "TOTAL_TOTAL":
			val = originalTotalTotal * (remainingQty / totalQty)
		case "TOTAL_", "AAAAA":
			val = remainingQty * consumerPrice
		case "DISC_", "FFFFF", "DISCOUNT":
			v, _ := toFloat64(colMap[upperCol])
			val = v
		case "DISC_VALUE", "DISC_VAL":
			v, _ := toFloat64(colMap[upperCol])
			val = v * (remainingQty / totalQty)
		case "CO_CLOSE":
			val = 0
		default:
			val = colMap[upperCol]
			dbType := typeMap[upperCol]

			// Convert decimal.Decimal to float64 to prevent driver conversion strings from exceeding precision limits
			if d, ok := val.(decimal.Decimal); ok {
				f, _ := d.Float64()
				val = f
			} else if bytesVal, ok := val.([]byte); ok {
				if dbType == "INT64" || dbType == "FLOAT" || dbType == "LONG" || dbType == "SHORT" || dbType == "DOUBLE PRECISION" {
					strBytes := string(bytesVal)
					var f float64
					if _, err := fmt.Sscanf(strBytes, "%f", &f); err == nil {
						val = f
					} else {
						val = strBytes
					}
				} else {
					val = string(bytesVal)
				}
			}
			
			// Safe truncate string values to avoid Firebird driver UTF-8 byte length overflow
			if strVal, ok := val.(string); ok {
				strVal = strings.TrimSpace(strVal)
				switch upperCol {
				case "CM_NAMEM", "MO_NAMEM", "USERS_LAST", "COMPUTER_LAST", "POIS_ALL":
					strVal = truncateToBytes(strVal, 25)
				case "PROD_SN_NO":
					strVal = truncateToBytes(strVal, 20)
				case "USERS_NAME":
					strVal = truncateToBytes(strVal, 60)
				case "MY_COMPUTER":
					strVal = truncateToBytes(strVal, 50)
				case "NOTS_":
					strVal = truncateToBytes(strVal, 150)
				default:
					strVal = truncateToBytes(strVal, 15) // default safe limit
				}
				val = encodeToWindows1256(strVal)
			}

			// Bypass COST = 0 trigger exception and scale TOTAL_COST
			switch upperCol {
			case "COST":
				costVal := 0.0
				if f, ok := val.(float64); ok {
					costVal = f
				} else if f, ok := val.(float32); ok {
					costVal = float64(f)
				}
				if costVal == 0 {
					val = 0.00001
				}
			case "TOTAL_COST":
				costVal := 0.0
				if f, ok := val.(float64); ok {
					costVal = f
				} else if f, ok := val.(float32); ok {
					costVal = float64(f)
				}
				if costVal == 0 {
					costVal = 0.00001
				}
				val = remainingQty * costVal
			}
		}
		insertValues = append(insertValues, val)
	}

	insertSQL := fmt.Sprintf(
		"INSERT INTO INVOICES_D (%s) VALUES (%s)",
		strings.Join(insertCols, ", "),
		strings.Join(insertPlaceholders, ", "),
	)

	_, err = tx.Exec(insertSQL, insertValues...)
	if err != nil {
		return 0, fmt.Errorf("failed to insert remaining split row: %w", err)
	}

	// Restore CLOSE_ = 1 on the header if it was originally closed
	if isClosed {
		_, err = tx.Exec("UPDATE INVOICES_H SET CLOSE_ = 1 WHERE INVOICES_H_ID = ?", hID)
		if err != nil {
			return 0, fmt.Errorf("failed to restore CLOSE_ status: %w", err)
		}
	}

	return int(hID), tx.Commit()
}

func truncateToBytes(s string, maxBytes int) string {
	if len(s) <= maxBytes {
		return s
	}
	res := s[:maxBytes]
	// Safely cut back to a valid UTF-8 boundary
	for len(res) > 0 && !utf8.ValidString(res) {
		res = res[:len(res)-1]
	}
	return res
}

func encodeToWindows1256(s string) []byte {
	encoder := charmap.Windows1256.NewEncoder()
	bytesVal, err := encoder.Bytes([]byte(s))
	if err != nil {
		return []byte(s) // fallback
	}
	return bytesVal
}
