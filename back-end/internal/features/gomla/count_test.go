package gomla

import (
	"fmt"
	"testing"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
)

func TestCountItems(t *testing.T) {
	cfg := core.LoadConfig()
	db.InitDB(cfg)
	db.InitFirebird(cfg)

	repo := NewGomlaRepository()

	invoices := []int{1042, 1033}
	total := 0
	for _, id := range invoices {
		_, itemsRows, err := repo.GetInvoiceDetails(id)
		if err != nil {
			t.Logf("Error for %d: %v", id, err)
			continue
		}
		count := 0
		for itemsRows.Next() {
			count++
		}
		itemsRows.Close()
		fmt.Printf("Invoice %d has %d items\n", id, count)
		total += count
	}
	fmt.Printf("Total items: %d\n", total)
}
