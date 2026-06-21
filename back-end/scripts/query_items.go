//go:build ignore

package main

import (
	"fmt"
	"log"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
)

func main() {
	config := core.LoadConfig()
	db.InitDB(config)
	db.InitFirebird(config)

	query := `
		SELECT FIRST 1
			H.INVOICES_H_ID,
			A.ACCOUNT_NAME,
			D.PROD_ID,
			P.PROD_NAME,
			D.PROD_SN_NO,
			D.EXPIRE_DATE
		FROM INVOICES_D D
		JOIN INVOICES_H H ON D.INVOICES_H_ID = H.INVOICES_H_ID
		JOIN PRODUCTS P ON D.PROD_ID = P.PROD_ID
        JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE D.PROD_ID = 24622
		ORDER BY H.INVOICES_H_ID DESC
	`

	rows, err := db.FB.Query(query)
	if err != nil {
		log.Fatal("Query error:", err)
	}
	defer rows.Close()

	fmt.Println("--- Recent Invoices for the Item ---")
	for rows.Next() {
		var hID int
		var clientName, batch, expDate, prodName string
		var itemsID int
		
		err := rows.Scan(&hID, &clientName, &itemsID, &prodName, &batch, &expDate)
		if err != nil {
			log.Println("Scan error:", err)
			continue
		}
		
		fmt.Printf("Invoice: %d | Client: %s | ItemID: %d | Name: %s | Batch: %s | Expiry: %s\n", hID, clientName, itemsID, prodName, batch, expDate)
	}
}
