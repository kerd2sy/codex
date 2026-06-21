//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"log"
	"database/sql"
	_ "github.com/nakagami/firebirdsql"
)

func main() {
	conn := "SYSDBA:masterkey@127.0.0.1:3055/D:\\ORGA_SOFT\\DATA\\ORGA.GDB?charset=WIN1256"
	db, err := sql.Open("firebirdsql", conn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	query := `
		SELECT H.INVOICES_H_ID, H.DATE_D, H.TIME_T, CAST(H.TOTAL_TOTAL AS DOUBLE PRECISION), H.USERS_NAME, A.ACCOUNT_NAME,
		       H.ACCOUNT_ID, H.BACET_ID, H.KARTONA1_ID, H.COUNT_FREEZE, H.CUS_NAME
		FROM INVOICES_H H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE H.INVOICES_H_ID = ?
	`
	
	row := db.QueryRow(query, 274357)

	var (
		invID, pharmName, writer, accountID sql.NullString
		date, timeRaw                       sql.NullString
		total                               sql.NullFloat64
		bacet, kartona, freeze              sql.NullInt64
		cusName                             sql.NullString
	)

	err = row.Scan(&invID, &date, &timeRaw, &total, &writer, &pharmName, &accountID, &bacet, &kartona, &freeze, &cusName)
	if err != nil {
		fmt.Printf("SCAN ERROR: %v\n", err)
	} else {
		fmt.Printf("SCAN SUCCESS! cusName=%s\n", cusName.String)
	}
}

