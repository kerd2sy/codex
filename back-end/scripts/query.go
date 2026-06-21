//go:build ignore
// +build ignore

package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/nakagami/firebirdsql"
)

func main() {
	db, err := sql.Open("firebirdsql", "SYSDBA:masterkey@192.168.100.6:3050/E:\\ORGA_SOFT\\DATA\\ORGA.GDB")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	query := `
		SELECT STORE_ID, TOTAL_QTY_ALL FROM STOCK_STOCK WHERE PROD_ID = 18150
	`
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal("Query error:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int
		var qty float64
		if err := rows.Scan(&id, &qty); err != nil {
			log.Fatal("Scan error:", err)
		}
		fmt.Printf("Store ID: %d, Qty: %f\n", id, qty)
	}
}

