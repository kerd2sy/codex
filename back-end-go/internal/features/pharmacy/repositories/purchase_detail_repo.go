package repositories

import (
	"database/sql"
	"fmt"
	"tabarak-pharma-backend/internal/db"
)

// Add these methods to PurchaseRepository

func (r *PurchaseRepository) GetInvoiceHeader(id int, source string) (*sql.Row, error) {
	table := "INVOICES_H"
	idCol := "INVOICES_H_ID"
	extraCols := "H.BACET_ID, H.KARTONA1_ID, H.COUNT_FREEZE"

	switch source {
	case "HH":
		table = "INVOICES_HH"
		idCol = "INVOICES_HH_ID"
	case "O":
		table = "ORDER_H"
		idCol = "ORDER_H_ID"
		extraCols = "0 as BACET_ID, 0 as KARTONA1_ID, 0 as COUNT_FREEZE"
	}

	query := fmt.Sprintf(`
		SELECT H.%s, H.DATE_D, H.TIME_T, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION), H.USERS_NAME, A.ACCOUNT_NAME,
		       H.ACCOUNT_ID, %s
		FROM %s H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE H.%s = ?
	`, idCol, extraCols, table, idCol)

	return db.FB.QueryRow(query, id), nil
}

func (r *PurchaseRepository) GetInvoiceItems(id int, source string) (*sql.Rows, error) {
	table := "INVOICES_D"
	joinKey := "INVOICES_H_ID"

	switch source {
	case "HH":
		table = "INVOICES_DD"
		joinKey = "INVOICES_HH_ID"
	case "O":
		table = "ORDER_D"
		joinKey = "ORDER_H_ID"
	}

	query := fmt.Sprintf(`
		SELECT P.PROD_NAME, I.TOTAL_QTY_ALL, CAST(I.CONSUMER AS DOUBLE PRECISION), 
		       CAST(I.TOTAL_TOTAL AS DOUBLE PRECISION), CAST(I.DISCOUNT1 AS DOUBLE PRECISION),
		       I.PROD_ID,
		       (SELECT FIRST 1 'R_' || RD.INVOICES_R_H_ID FROM INVOICES_R_D RD 
		        WHERE RD.INVOICES_H_ID = I.%s AND RD.PROD_ID = I.PROD_ID) as RET_ID_R,
		       (SELECT FIRST 1 'RR_' || RRD.INVOICES_RR_H_ID FROM INVOICES_RR_D RRD 
		        WHERE RRD.INVOICES_H_ID = I.%s AND RRD.PROD_ID = I.PROD_ID) as RET_ID_RR
		FROM %s I
		JOIN PRODUCTS P ON I.PROD_ID = P.PROD_ID
		WHERE I.%s = ?
	`, joinKey, joinKey, table, joinKey)

	return db.FB.Query(query, id)
}

func (r *PurchaseRepository) GetReturnHeader(id int, source string) (*sql.Row, error) {
	table := "INVOICES_R_H"
	idCol := "INVOICES_R_H_ID"

	switch source {
	case "RR":
		table = "INVOICES_RR_H"
		idCol = "INVOICES_RR_H_ID"
	case "OR":
		table = "ORDER_R_H"
		idCol = "ORDER_R_H_ID"
	}

	query := fmt.Sprintf(`
		SELECT H.%s, H.DATE_D, H.TIME_T, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION), H.USERS_NAME, A.ACCOUNT_NAME,
		       H.ACCOUNT_ID, 0 as BACET_ID, 0 as KARTONA1_ID, 0 as COUNT_FREEZE
		FROM %s H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE H.%s = ?
	`, idCol, table, idCol)

	return db.FB.QueryRow(query, id), nil
}

func (r *PurchaseRepository) GetReturnItems(id int, source string) (*sql.Rows, error) {
	table := "INVOICES_R_D"
	joinKey := "INVOICES_R_H_ID"

	switch source {
	case "RR":
		table = "INVOICES_RR_D"
		joinKey = "INVOICES_RR_H_ID"
	case "OR":
		table = "ORDER_R_D"
		joinKey = "ORDER_R_H_ID"
	}

	query := fmt.Sprintf(`
		SELECT P.PROD_NAME, I.TOTAL_QTY_ALL, CAST(I.CONSUMER AS DOUBLE PRECISION), 
		       CAST(I.TOTAL_TOTAL AS DOUBLE PRECISION), CAST(I.DISCOUNT1 AS DOUBLE PRECISION),
		       I.PROD_ID, NULL, NULL
		FROM %s I
		JOIN PRODUCTS P ON I.PROD_ID = P.PROD_ID
		WHERE I.%s = ?
	`, table, joinKey)

	return db.FB.Query(query, id)
}
