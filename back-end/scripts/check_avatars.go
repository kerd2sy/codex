//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type InvoiceAuditRecord struct {
	ID                uint
	InvoiceID         int
	EditingByUserID   *uint
	AuditedByUserID   *uint
}

func main() {
	dsn := "postgresql://postgres.wnrjcwwoijucwzxwvsmj:Q7GyJV6ZA3LVmZ9w@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&default_query_exec_mode=simple_protocol"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("failed to connect database", err)
		return
	}

	var records []InvoiceAuditRecord
	db.Order("id desc").Limit(10).Find(&records)

	for _, r := range records {
        var e, a uint
        if r.EditingByUserID != nil { e = *r.EditingByUserID }
        if r.AuditedByUserID != nil { a = *r.AuditedByUserID }
		fmt.Printf("InvoiceID: %d, EditingUser: %d, AuditedUser: %d\n", r.InvoiceID, e, a)
	}
}

