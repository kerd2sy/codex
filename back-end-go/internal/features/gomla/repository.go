package gomla

import (
	"database/sql"
	"fmt"
	"strings"
	"tabarak-pharma-backend/internal/db"

	"github.com/shopspring/decimal"
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
		WHERE H.INVOICES_H_ID = ?
	`, id)

	itemsRows, err := db.FB.Query(`
		SELECT D.INVOICES_D_ID, P.PROD_NAME, D.TOTAL_QTY_ALL, CAST(D.CONSUMER AS DOUBLE PRECISION), 
		       CAST(D.TOTAL_TOTAL AS DOUBLE PRECISION), D.PROD_ID,
		       D.PROD_SN_NO, D.EXPIRE_DATE, P.BARCODE
		FROM INVOICES_D D
		JOIN PRODUCTS P ON D.PROD_ID = P.PROD_ID
		WHERE D.INVOICES_H_ID = ?
	`, id)

	return headerRow, itemsRows, err
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

func (r *GomlaRepository) SplitOrUpdateItem(dID int, batch string, expiry string, auditQty float64) error {
	tx, err := db.FB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Query all columns of the original row to duplicate it dynamically
	rows, err := tx.Query("SELECT * FROM INVOICES_D WHERE INVOICES_D_ID = ?", dID)
	if err != nil {
		return err
	}
	cols, err := rows.Columns()
	if err != nil {
		rows.Close()
		return err
	}

	if !rows.Next() {
		rows.Close()
		return fmt.Errorf("item not found")
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
		return err
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

	hID, ok := toInt64(colMap["INVOICES_H_ID"])
	if !ok {
		return fmt.Errorf("failed to get INVOICES_H_ID from item columns")
	}

	// Fetch current CLOSE_ value of the header
	var originalClose sql.NullInt64
	err = tx.QueryRow("SELECT CLOSE_ FROM INVOICES_H WHERE INVOICES_H_ID = ?", hID).Scan(&originalClose)
	if err != nil {
		return fmt.Errorf("failed to query CLOSE_ from INVOICES_H: %w", err)
	}

	// If closed, temporarily open it within transaction
	isClosed := originalClose.Valid && originalClose.Int64 == 1
	if isClosed {
		_, err = tx.Exec("UPDATE INVOICES_H SET CLOSE_ = 0 WHERE INVOICES_H_ID = ?", hID)
		if err != nil {
			return fmt.Errorf("failed to temporarily open invoice header: %w", err)
		}
	}

	if auditQty <= 0 || auditQty >= totalQty {
		// Just standard update, no split needed!
		_, err = tx.Exec(`
			UPDATE INVOICES_D 
			SET PROD_SN_NO = ?, EXPIRE_DATE = ?
			WHERE INVOICES_D_ID = ?
		`, batch, expiry, dID)
		if err != nil {
			return err
		}

		// Restore CLOSE_ = 1 on the header if it was originally closed
		if isClosed {
			_, err = tx.Exec("UPDATE INVOICES_H SET CLOSE_ = 1 WHERE INVOICES_H_ID = ?", hID)
			if err != nil {
				return fmt.Errorf("failed to restore CLOSE_ status: %w", err)
			}
		}

		return tx.Commit()
	}

	// Otherwise, split the row!
	remainingQty := totalQty - auditQty

	// 1. Update the original row with audited quantity, batch, and expiry
	_, err = tx.Exec(`
		UPDATE INVOICES_D 
		SET TOTAL_QTY_ALL = ?, PROD_SN_NO = ?, EXPIRE_DATE = ?, TOTAL_TOTAL = ? * CONSUMER
		WHERE INVOICES_D_ID = ?
	`, auditQty, batch, expiry, auditQty, dID)
	if err != nil {
		return err
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
		if upperCol == "TOTAL_QTY_ALL" {
			val = remainingQty
		} else if upperCol == "TOTAL_TOTAL" {
			val = remainingQty * consumerPrice
		} else if upperCol == "CO_CLOSE" {
			val = 0
		} else {
			val = colMap[upperCol]
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
		return fmt.Errorf("failed to insert remaining split row: %w", err)
	}

	// Restore CLOSE_ = 1 on the header if it was originally closed
	if isClosed {
		_, err = tx.Exec("UPDATE INVOICES_H SET CLOSE_ = 1 WHERE INVOICES_H_ID = ?", hID)
		if err != nil {
			return fmt.Errorf("failed to restore CLOSE_ status: %w", err)
		}
	}

	return tx.Commit()
}
