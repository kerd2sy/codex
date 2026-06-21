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

	var cusName, usersName, accountName sql.NullString
	err = db.QueryRow(`
		SELECT H.CUS_NAME, H.USERS_NAME, A.ACCOUNT_NAME
		FROM INVOICES_H H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE H.INVOICES_H_ID = 274357
	`).Scan(&cusName, &usersName, &accountName)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("CUS_NAME: '%s'\n", cusName.String)
	fmt.Printf("USERS_NAME: '%s'\n", usersName.String)
	fmt.Printf("ACCOUNT_NAME: '%s'\n", accountName.String)
}

