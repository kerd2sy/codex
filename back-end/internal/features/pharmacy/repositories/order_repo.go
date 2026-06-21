package repositories

import (
	"database/sql"
	"fmt"
	"strings"
	"tabarak-pharma-backend/internal/db"
)

type OrderRepository struct{}

func NewOrderRepository() *OrderRepository {
	return &OrderRepository{}
}

func (r *OrderRepository) GetPurchaseOrders(pharmaCodes []int, limit int, skip int, sort string) (*sql.Rows, error) {
	if len(pharmaCodes) == 0 {
		return nil, sql.ErrNoRows
	}

	placeholders := make([]string, len(pharmaCodes))
	args := make([]interface{}, len(pharmaCodes))
	for i, code := range pharmaCodes {
		placeholders[i] = "?"
		args[i] = code
	}
	phStr := strings.Join(placeholders, ",")

	order := "DESC"
	if strings.ToUpper(sort) == "ASC" {
		order = "ASC"
	}

	query := fmt.Sprintf(`
		SELECT FIRST ? SKIP ? * FROM (
			SELECT 
				H.INVOICES_H_ID, H.DATE_D, H.TIME_T, H.STORE_IN_TIME, H.STORE_UP_TIME, H.STORE_OUT_TIME,
				CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION) AS TOTAL, H.COUNT_PROD, A.ACCOUNT_NAME, H.USERS_NAME,
				H.CLOSE_ as IS_CLOSE, 'H' as SOURCE, H.BACET_ID, H.KARTONA1_ID, H.COUNT_FREEZE, H.ACCOUNT_ID
			FROM INVOICES_H H
			LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
			WHERE H.ACCOUNT_ID IN (%s) AND H.TOTAL_TOTAL <> 0
			
			UNION ALL
			
			SELECT 
				HH.INVOICES_HH_ID, HH.DATE_D, HH.TIME_T, HH.STORE_IN_TIME, HH.STORE_UP_TIME, HH.STORE_OUT_TIME,
				CAST(HH.TOTAL_TOTAL AS DOUBLE PRECISION) AS TOTAL, HH.COUNT_PROD, A.ACCOUNT_NAME, HH.USERS_NAME,
				1 as IS_CLOSE, 'HH' as SOURCE, HH.BACET_ID, HH.KARTONA1_ID, HH.COUNT_FREEZE, HH.ACCOUNT_ID
			FROM INVOICES_HH HH
			LEFT JOIN ACCOUNTS A ON HH.ACCOUNT_ID = A.ACCOUNT_ID
			WHERE HH.ACCOUNT_ID IN (%s) AND HH.TOTAL_TOTAL <> 0
		) AS T
		ORDER BY DATE_D %s, TIME_T %s
	`, phStr, phStr, order, order)

	// Combine args: limit, skip, pharmaCodes (for UNION 1), pharmaCodes (for UNION 2)
	allArgs := []interface{}{limit, skip}
	allArgs = append(allArgs, args...)
	allArgs = append(allArgs, args...)

	return db.FB.Query(query, allArgs...)
}

func (r *OrderRepository) GetSalesOrders(pharmaCodes []int, limit int, skip int, sort string) (*sql.Rows, error) {
	if len(pharmaCodes) == 0 {
		return nil, sql.ErrNoRows
	}

	placeholders := make([]string, len(pharmaCodes))
	args := make([]interface{}, len(pharmaCodes))
	for i, code := range pharmaCodes {
		placeholders[i] = "?"
		args[i] = code
	}
	phStr := strings.Join(placeholders, ",")

	order := "DESC"
	if strings.ToUpper(sort) == "ASC" {
		order = "ASC"
	}

	query := fmt.Sprintf(`
		SELECT FIRST ? SKIP ?
			O.ORDER_H_ID, O.DATE_D, O.TIME_T, CAST(O.TOTAL_TOTAL AS DOUBLE PRECISION) AS TOTAL, 
			O.COUNT_PROD, A.ACCOUNT_NAME, O.USERS_NAME, O.ACCOUNT_ID
		FROM ORDER_H O
		LEFT JOIN ACCOUNTS A ON O.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE O.ACCOUNT_ID IN (%s) AND O.TOTAL_TOTAL <> 0
		ORDER BY DATE_D %s, TIME_T %s
	`, phStr, order, order)

	allArgs := []interface{}{limit, skip}
	allArgs = append(allArgs, args...)

	return db.FB.Query(query, allArgs...)
}
