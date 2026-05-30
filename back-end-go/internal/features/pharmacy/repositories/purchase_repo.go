package repositories

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"tabarak-pharma-backend/internal/db"
)

type PurchaseRepository struct{}

func NewPurchaseRepository() *PurchaseRepository {
	return &PurchaseRepository{}
}

func (r *PurchaseRepository) GetBalance(pharmaCodes []int) (float64, float64, error) {
	if len(pharmaCodes) == 0 {
		return 0, 0, nil
	}

	phStr := r.joinCodes(pharmaCodes)

	// Combine all sums into one query for performance
	query := fmt.Sprintf(`
		SELECT 
			(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_H WHERE ACCOUNT_ID IN (%s)) as d1,
			(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_HH WHERE ACCOUNT_ID IN (%s)) as d2,
			(SELECT SUM(CAST(CASH AS DOUBLE PRECISION)) FROM PAY_CASH WHERE ACCOUNT_ID IN (%s)) as d3,
			(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM ORDER_R_H WHERE ACCOUNT_ID IN (%s)) as d4,
			(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM ORDER_H WHERE ACCOUNT_ID IN (%s)) as c1,
			(SELECT SUM(CAST(CASH AS DOUBLE PRECISION)) FROM INCOME_CASH WHERE ACCOUNT_ID IN (%s)) as c2,
			(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_R_H WHERE ACCOUNT_ID IN (%s)) as c3,
			(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_RR_H WHERE ACCOUNT_ID IN (%s)) as c4,
			(SELECT SUM(CAST(MBALANCE AS DOUBLE PRECISION)) FROM ACCOUNTS WHERE ACCOUNT_ID IN (%s)) as mbal,
			(SELECT SUM(CAST(LIMIT_CASH AS DOUBLE PRECISION)) FROM ACCOUNTS WHERE ACCOUNT_ID IN (%s)) as lim
		FROM RDB$DATABASE
	`, phStr, phStr, phStr, phStr, phStr, phStr, phStr, phStr, phStr, phStr)

	var d1, d2, d3, d4, c1, c2, c3, c4, mbal, lim sql.NullFloat64
	err := db.FB.QueryRow(query).Scan(&d1, &d2, &d3, &d4, &c1, &c2, &c3, &c4, &mbal, &lim)
	if err != nil {
		return 0, 0, err
	}

	debits := d1.Float64 + d2.Float64 + d3.Float64 + d4.Float64
	credits := c1.Float64 + c2.Float64 + c3.Float64 + c4.Float64
	balance := mbal.Float64 + debits - credits
	
	return balance, lim.Float64, nil
}

func (r *PurchaseRepository) GetPurchases(pharmaCodes []int, limit int, skip int, sort string) (*sql.Rows, error) {
	phStr := r.joinCodes(pharmaCodes)
	
	// Optimized strategy: Fetch from both tables separately using indexes and then UNION them
	// This is much faster than a complex UNION with a global ORDER BY on large tables
	finalQuery := fmt.Sprintf(`
		SELECT FIRST ? SKIP ?
			ID, DATE_D, TIME_T, TOTAL, SRC, USR, ACC
		FROM (
			SELECT H.INVOICES_H_ID as ID, H.DATE_D, H.TIME_T, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'H' as SRC, H.USERS_NAME as USR, A.ACCOUNT_NAME as ACC
			FROM INVOICES_H H JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
			WHERE H.ACCOUNT_ID IN (%s) AND H.TOTAL_TOTAL <> 0
			UNION ALL
			SELECT H.INVOICES_HH_ID as ID, H.DATE_D, H.TIME_T, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'HH' as SRC, H.USERS_NAME as USR, A.ACCOUNT_NAME as ACC
			FROM INVOICES_HH H JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
			WHERE H.ACCOUNT_ID IN (%s) AND H.TOTAL_TOTAL <> 0
		) ORDER BY 2 %s, 3 %s
	`, phStr, phStr, sort, sort)

	return db.FB.Query(finalQuery, limit, skip)
}

func (r *PurchaseRepository) GetReturns(pharmaCodes []int, limit int, skip int, sort string) (*sql.Rows, error) {
	phStr := r.joinCodes(pharmaCodes)
	query := fmt.Sprintf(`
		SELECT FIRST ? SKIP ?
			ID, DATE_D, TIME_T, TOTAL, SRC, USR, ACC
		FROM (
			SELECT H.INVOICES_R_H_ID as ID, H.DATE_D, H.TIME_T, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'R' as SRC, H.USERS_NAME as USR, A.ACCOUNT_NAME as ACC
			FROM INVOICES_R_H H JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
			WHERE H.ACCOUNT_ID IN (%s) AND H.TOTAL_TOTAL <> 0
			UNION ALL
			SELECT H.INVOICES_RR_H_ID as ID, H.DATE_D, H.TIME_T, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'RR' as SRC, H.USERS_NAME as USR, A.ACCOUNT_NAME as ACC
			FROM INVOICES_RR_H H JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
			WHERE H.ACCOUNT_ID IN (%s) AND H.TOTAL_TOTAL <> 0
		) ORDER BY 2 %s, 3 %s
	`, phStr, phStr, sort, sort)

	return db.FB.Query(query, limit, skip)
}

func (r *PurchaseRepository) GetCashFlow(pharmaCodes []int, limit int, skip int, sort string) (*sql.Rows, error) {
	phStr := r.joinCodes(pharmaCodes)
	query := fmt.Sprintf(`
		SELECT FIRST ? SKIP ? ID, DATE_D, TIME_T, CASH, ACCOUNT_NAME, KIND_, WRITER FROM (
			SELECT I.INCOME_CASH_ID as ID, I.DATE_D, I.TIME_T, CAST(I.CASH AS DOUBLE PRECISION) as CASH, A.ACCOUNT_NAME, 11 as KIND_, I.USERS_NAME as WRITER, I.ACCOUNT_ID
			FROM INCOME_CASH I JOIN ACCOUNTS A ON I.ACCOUNT_ID = A.ACCOUNT_ID
			WHERE I.CASH <> 0
			UNION ALL
			SELECT P.PAY_CASH_ID as ID, P.DATE_D, P.TIME_T, CAST(P.CASH AS DOUBLE PRECISION) as CASH, A.ACCOUNT_NAME, 12 as KIND_, P.USERS_NAME as WRITER, P.ACCOUNT_ID
			FROM PAY_CASH P JOIN ACCOUNTS A ON P.ACCOUNT_ID = A.ACCOUNT_ID
			WHERE P.CASH <> 0
		) WHERE ACCOUNT_ID IN (%s)
		ORDER BY 2 %s, 3 %s
	`, phStr, sort, sort)

	return db.FB.Query(query, limit, skip)
}

func (r *PurchaseRepository) GetStatement(pharmaCodes []int, limit int, skip int, dateFrom string) (*sql.Rows, error) {
	phStr := r.joinCodes(pharmaCodes)
	
	datePart := ""
	var args []interface{}
	args = append(args, limit, skip)
	
	if dateFrom != "" {
		datePart = "AND DATE_D >= CAST(? AS DATE)"
	}

	query := fmt.Sprintf(`
		SELECT FIRST ? SKIP ?
			T.ID, T.DATE_D, T.TIME_T, T.TOTAL, T.SOURCE
		FROM (
			SELECT INVOICES_H_ID as ID, DATE_D, TIME_T, CAST(TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'H' as SOURCE, ACCOUNT_ID FROM INVOICES_H WHERE TOTAL_TOTAL <> 0 %s
			UNION ALL
			SELECT INVOICES_HH_ID as ID, DATE_D, TIME_T, CAST(TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'HH' as SOURCE, ACCOUNT_ID FROM INVOICES_HH WHERE TOTAL_TOTAL <> 0 %s
			UNION ALL
			SELECT INCOME_CASH_ID as ID, DATE_D, TIME_T, CAST(CASH AS DOUBLE PRECISION) as TOTAL, 'I' as SOURCE, ACCOUNT_ID FROM INCOME_CASH WHERE CASH <> 0 %s
			UNION ALL
			SELECT PAY_CASH_ID as ID, DATE_D, TIME_T, CAST(CASH AS DOUBLE PRECISION) as TOTAL, 'P' as SOURCE, ACCOUNT_ID FROM PAY_CASH WHERE CASH <> 0 %s
			UNION ALL
			SELECT INVOICES_R_H_ID as ID, DATE_D, TIME_T, CAST(TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'R' as SOURCE, ACCOUNT_ID FROM INVOICES_R_H WHERE TOTAL_TOTAL <> 0 %s
			UNION ALL
			SELECT INVOICES_RR_H_ID as ID, DATE_D, TIME_T, CAST(TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'RR' as SOURCE, ACCOUNT_ID FROM INVOICES_RR_H WHERE TOTAL_TOTAL <> 0 %s
			UNION ALL
			SELECT ORDER_H_ID as ID, DATE_D, TIME_T, CAST(TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'O' as SOURCE, ACCOUNT_ID FROM ORDER_H WHERE TOTAL_TOTAL <> 0 %s
			UNION ALL
			SELECT ORDER_R_H_ID as ID, DATE_D, TIME_T, CAST(TOTAL_TOTAL AS DOUBLE PRECISION) as TOTAL, 'OR' as SOURCE, ACCOUNT_ID FROM ORDER_R_H WHERE TOTAL_TOTAL <> 0 %s
		) T
		WHERE T.ACCOUNT_ID IN (%s)
		ORDER BY T.DATE_D DESC, T.TIME_T DESC
	`, datePart, datePart, datePart, datePart, datePart, datePart, datePart, datePart, phStr)

	if dateFrom != "" {
		for i := 0; i < 8; i++ {
			args = append(args, dateFrom)
		}
	}

	log.Printf("[Firebird] GetStatement Codes: %v, DateFrom: %s", pharmaCodes, dateFrom)
	return db.FB.Query(query, args...)
}

func (r *PurchaseRepository) joinCodes(codes []int) string {
	strs := make([]string, len(codes))
	for i, c := range codes {
		strs[i] = fmt.Sprintf("%d", c)
	}
	return strings.Join(strs, ",")
}
