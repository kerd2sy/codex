//go:build ignore

package main

import (
	"fmt"
	"log"
	"sync"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/features/gomla"
)

func main() {
	config := core.LoadConfig()
	db.InitDB(config)
	db.InitFirebird(config)

	var dID int
	// Find a Gomla invoice item
	err := db.FB.QueryRow(`
		SELECT FIRST 1 D.INVOICES_D_ID 
		FROM INVOICES_D D 
		JOIN INVOICES_H H ON D.INVOICES_H_ID = H.INVOICES_H_ID 
		WHERE H.STORE_ID = 3
	`).Scan(&dID)
	if err != nil {
		log.Fatal("Could not find an invoice item:", err)
	}

	fmt.Printf("Starting stress test on Gomla INVOICES_D_ID: %d\n", dID)

	service := gomla.NewGomlaService()
	var wg sync.WaitGroup

	numWorkers := 10
	errors := 0
	var mu sync.Mutex

	for i := 1; i <= numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			batch := fmt.Sprintf("BATCH-%d", workerID)
			expiry := "2026-10-10"
			
			err := service.UpdateItemBatchAndExpiry(dID, batch, expiry, 0, 1, fmt.Sprintf("Worker-%d", workerID))
			
			if err != nil {
				mu.Lock()
				errors++
				fmt.Printf("Worker %d failed: %v\n", workerID, err)
				mu.Unlock()
			} else {
				fmt.Printf("Worker %d succeeded\n", workerID)
			}
		}(i)
	}

	wg.Wait()

	fmt.Printf("\n--- Stress Test Results ---\n")
	fmt.Printf("Total Requests: %d\n", numWorkers)
	fmt.Printf("Successful: %d\n", numWorkers-errors)
	fmt.Printf("Failed: %d\n", errors)
	
	if errors == 0 {
		fmt.Println("SUCCESS: No concurrency issues detected!")
	} else {
		fmt.Println("FAILED: Concurrency issues occurred.")
	}
}
