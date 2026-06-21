package main

import (
	"fmt"

	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/features/gomla"
)

func main() {
	cfg := core.LoadConfig()

	// Initialize DB connection
	db.InitDB(cfg)
	db.InitFirebird(cfg)

	service := gomla.NewGomlaService()

	invoices := []int{1042, 1033}
	totalItems := 0

	for _, id := range invoices {
		details, err := service.GetInvoiceDetail(id)
		if err != nil {
			fmt.Printf("Error fetching %d: %v\n", id, err)
			continue
		}
		items := details["items"].([]map[string]interface{})
		count := len(items)
		fmt.Printf("Invoice %d has %d items\n", id, count)
		totalItems += count
	}

	fmt.Printf("Total items for invoices 1042 and 1033: %d\n", totalItems)
}
