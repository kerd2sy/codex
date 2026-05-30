package admin

import (
	"database/sql"
	"fmt"
	"log"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

type AdminStats struct {
	TotalPharmacies  int64   `json:"totalPharmacies"`
	ActiveUsers      int64   `json:"activeUsers"`
	TodayInvoices    int64   `json:"todayInvoices"`
	TodayCollections float64 `json:"todayCollections"`
	PendingRequests  int64   `json:"pendingRequests"`
}

type AdminService struct{}

func NewAdminService() *AdminService {
	return &AdminService{}
}

func (s *AdminService) GetDashboardStats() (*AdminStats, error) {
	stats := &AdminStats{
		PendingRequests: 0, // Placeholder as pharmacies don't have a status field yet
	}

	// 1. Get Total Pharmacies (Postgres)
	if err := db.DB.Model(&models.Pharmacy{}).Count(&stats.TotalPharmacies).Error; err != nil {
		log.Println("Error counting pharmacies:", err)
	}

	// 2. Get Active Users (Postgres) - Assuming not blocked users are active
	if err := db.DB.Model(&models.User{}).Where("is_blocked = ?", false).Count(&stats.ActiveUsers).Error; err != nil {
		log.Println("Error counting active users:", err)
	}

	// 3. Get Today's Invoices Count (Firebird) - Sales and Purchases
	invoiceQuery := `
		SELECT SUM(CNT) FROM (
			SELECT COUNT(*) as CNT FROM INVOICES_H WHERE DATE_D = CURRENT_DATE
			UNION ALL
			SELECT COUNT(*) as CNT FROM INVOICES_HH WHERE DATE_D = CURRENT_DATE
		)
	`
	var invoiceCount sql.NullInt64
	if err := db.FB.QueryRow(invoiceQuery).Scan(&invoiceCount); err != nil {
		log.Println("Error counting today's invoices:", err)
	}
	stats.TodayInvoices = invoiceCount.Int64

	// 4. Get Today's Collections (Firebird) - INCOME_CASH
	collectionsQuery := `
		SELECT SUM(CAST(CASH AS DOUBLE PRECISION)) FROM INCOME_CASH WHERE DATE_D = CURRENT_DATE
	`
	var todayCollections sql.NullFloat64
	if err := db.FB.QueryRow(collectionsQuery).Scan(&todayCollections); err != nil {
		log.Println("Error summing today's collections:", err)
	}
	stats.TodayCollections = todayCollections.Float64

	return stats, nil
}

type WarehouseStats struct {
	TotalCash               float64 `json:"total_cash"`
	TotalInvoices           int64   `json:"total_invoices"`
	TotalItems              int64   `json:"total_items"`
	UnprintedInvoices       int64   `json:"unprinted_invoices"`
	OpenInvoices            int64   `json:"open_invoices"`
	ClosedUnprintedInvoices int64   `json:"closed_unprinted_invoices"`
	InventoriedInvoices     int64   `json:"inventoried_invoices"`
	UninventoriedInvoices   int64   `json:"uninventoried_invoices"`
	InventoriedItems        int64   `json:"inventoried_items"`
	UninventoriedItems      int64   `json:"uninventoried_items"`
	TotalAmount             float64 `json:"total_amount"`
}

func (s *AdminService) GetWarehouseStats(storeID int, dateFrom, dateTo, timeFrom, timeTo string) (*WarehouseStats, error) {
	tsFrom := fmt.Sprintf("%s %s", dateFrom, timeFrom)
	tsTo := fmt.Sprintf("%s %s", dateTo, timeTo)

	// 1. Get Total Cash
	cashQuery := `
		SELECT SUM(CAST(CASH AS DOUBLE PRECISION)) 
		FROM INCOME_CASH 
		WHERE (DATE_D + TIME_T) BETWEEN ? AND ?
	`
	var totalCash sql.NullFloat64
	if err := db.FB.QueryRow(cashQuery, tsFrom, tsTo).Scan(&totalCash); err != nil {
		log.Println("Error fetching warehouse total cash stats:", err)
	}

	// 2. Get Invoice metrics
	invQuery := `
		SELECT 
			COUNT(*), 
			SUM(COUNT_PROD),
			SUM(CASE WHEN PRINT_ = 0 THEN 1 ELSE 0 END),
			SUM(CASE WHEN CLOSE_ = 0 THEN 1 ELSE 0 END),
			SUM(CASE WHEN CLOSE_ = 1 AND PRINT_ = 0 THEN 1 ELSE 0 END),
			SUM(CASE WHEN STORE_IN = 1 AND STORE_UP = 1 THEN 1 ELSE 0 END),
			SUM(CASE WHEN STORE_IN = 1 AND (STORE_UP <> 1 OR STORE_UP IS NULL) THEN 1 ELSE 0 END),
			SUM(CASE WHEN STORE_IN = 1 AND STORE_UP = 1 THEN COUNT_PROD ELSE 0 END),
			SUM(CASE WHEN STORE_IN = 1 AND (STORE_UP <> 1 OR STORE_UP IS NULL) THEN COUNT_PROD ELSE 0 END),
			SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION))
		FROM INVOICES_H
		WHERE STORE_ID = ? 
		  AND (DATE_D + TIME_T) BETWEEN ? AND ?
		  AND TOTAL_TOTAL > 0
	`
	
	var count, countProd, print0, close0, close1Print0, select2, selectNot2, select2Prod, selectNot2Prod sql.NullInt64
	var totalAmount sql.NullFloat64
	
	err := db.FB.QueryRow(invQuery, storeID, tsFrom, tsTo).Scan(
		&count, &countProd, &print0, &close0, &close1Print0, 
		&select2, &selectNot2, &select2Prod, &selectNot2Prod, 
		&totalAmount,
	)
	if err != nil {
		log.Println("Error fetching warehouse invoice stats:", err)
	}

	return &WarehouseStats{
		TotalCash:               totalCash.Float64,
		TotalInvoices:           count.Int64,
		TotalItems:              countProd.Int64,
		UnprintedInvoices:       print0.Int64,
		OpenInvoices:            close0.Int64,
		ClosedUnprintedInvoices: close1Print0.Int64,
		InventoriedInvoices:     select2.Int64,
		UninventoriedInvoices:   selectNot2.Int64,
		InventoriedItems:        select2Prod.Int64,
		UninventoriedItems:      selectNot2Prod.Int64,
		TotalAmount:             totalAmount.Float64,
	}, nil
}

type AdminStore struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

func (s *AdminService) GetStores() ([]AdminStore, error) {
	query := "SELECT STORE_ID, COALESCE(STORE_NAME, 'مخزن ' || STORE_ID) FROM STORES"
	rows, err := db.FB.Query(query)
	if err != nil {
		return []AdminStore{{ID: 1, Name: "المخزن الرئيسي"}}, nil
	}
	defer rows.Close()

	var stores []AdminStore
	for rows.Next() {
		var store AdminStore
		if err := rows.Scan(&store.ID, &store.Name); err != nil {
			continue
		}
		stores = append(stores, store)
	}
	if len(stores) == 0 {
		stores = []AdminStore{{ID: 1, Name: "المخزن الرئيسي"}}
	}
	return stores, nil
}

func (s *AdminService) PrepareClosedInvoices(storeID int, dateFrom, dateTo, timeFrom, timeTo string) error {
	tsFrom := fmt.Sprintf("%s %s", dateFrom, timeFrom)
	tsTo := fmt.Sprintf("%s %s", dateTo, timeTo)
	
	query := `
		UPDATE INVOICES_H
		SET STORE_IN = 1, STORE_UP = 2
		WHERE STORE_ID = ?
		  AND CLOSE_ = 1
		  AND (DATE_D + TIME_T) BETWEEN ? AND ?
	`
	_, err := db.FB.Exec(query, storeID, tsFrom, tsTo)
	return err
}

type AdminSale struct {
	ID         string  `json:"id"`
	Date       string  `json:"date"`
	IsClosed   bool    `json:"is_closed"`
	ItemsCount int     `json:"items_count"`
	Total      float64 `json:"total"`
	UserName   string  `json:"user_name"`
}

func (s *AdminService) GetSales(limit, offset int, dateFrom, dateTo string) ([]AdminSale, error) {
	var sales []AdminSale
	
	query := `
		SELECT FIRST ? SKIP ?
			H.INVOICES_H_ID as ID, 
			H.DATE_D,
			COALESCE(H.CLOSE_, 0) as IS_CLOSED,
			(SELECT COUNT(*) FROM INVOICES_D D WHERE D.INVOICES_H_ID = H.INVOICES_H_ID) as ITEMS_COUNT,
			CAST(COALESCE(H.TOTAL_TOTAL, 0) AS DOUBLE PRECISION) as TOTAL,
			COALESCE(A.ACCOUNT_NAME, 'Unknown') as USERS_NAME
		FROM INVOICES_H H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE 1=1
	`
	args := []interface{}{limit, offset}

	if dateFrom != "" && dateTo != "" {
		query += " AND H.DATE_D >= CAST(? AS DATE) AND H.DATE_D <= CAST(? AS DATE)"
		args = append(args, dateFrom, dateTo)
	}

	query += " ORDER BY H.DATE_D DESC, H.TIME_T DESC"

	rows, err := db.FB.Query(query, args...)
	if err != nil {
		return []AdminSale{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var sale AdminSale
		var isClosed int
		var dateBytes []byte

		if err := rows.Scan(&sale.ID, &dateBytes, &isClosed, &sale.ItemsCount, &sale.Total, &sale.UserName); err != nil {
			log.Println("Admin GetSales Scan error:", err)
			continue
		}
		
		if len(dateBytes) > 10 {
			sale.Date = string(dateBytes[:10])
		} else {
			sale.Date = string(dateBytes)
		}
		sale.IsClosed = (isClosed == 1)
		sales = append(sales, sale)
	}
	
	if sales == nil {
		sales = []AdminSale{}
	}

	return sales, nil
}

type AdminSaleItem struct {
	ID       int     `json:"id"`
	Name     string  `json:"name"`
	Quantity float64 `json:"quantity"`
	Price    float64 `json:"price"`
	Total    float64 `json:"total"`
}

func (s *AdminService) GetSaleItems(invoiceID int) ([]AdminSaleItem, error) {
	query := `
		SELECT 
			D.INVOICES_D_ID as ID,
			COALESCE(TRIM(P.PROD_NAME), 'Unknown') as NAME,
			CAST(COALESCE(D.TOTAL_QTY_ALL, 0) AS DOUBLE PRECISION) as QUANTITY,
			CAST(COALESCE(D.PRICE_1, 0) AS DOUBLE PRECISION) as PRICE,
			CAST(COALESCE(D.TOTAL_TOTAL, 0) AS DOUBLE PRECISION) as TOTAL
		FROM INVOICES_D D
		LEFT JOIN PRODUCTS P ON D.PROD_ID = P.PROD_ID
		WHERE D.INVOICES_H_ID = ?
	`
	rows, err := db.FB.Query(query, invoiceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []AdminSaleItem
	for rows.Next() {
		var item AdminSaleItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Quantity, &item.Price, &item.Total); err != nil {
			log.Println("Admin GetSaleItems Scan error:", err)
			continue
		}
		items = append(items, item)
	}
	
	if items == nil {
		items = []AdminSaleItem{}
	}
	return items, nil
}

type AdminPharmacy struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Status      int     `json:"status"`
	Limit       float64 `json:"limit"`
	Kind        int     `json:"kind"`
	Tel1        string  `json:"tel1"`
	Tel2        string  `json:"tel2"`
	EmpID       int     `json:"emp_id"`
	EveningID   int     `json:"evening_id"`
	DistID      int     `json:"dist_id"`
	EmpName     string  `json:"emp_name"`
	EveningName string  `json:"evening_name"`
	DistName    string  `json:"dist_name"`
}

func (s *AdminService) GetPharmacies(limit, offset int, search string) ([]AdminPharmacy, error) {
	var pharmacies []AdminPharmacy

	query := `
		SELECT FIRST ? SKIP ?
			A.ACCOUNT_ID as ID,
			A.ACCOUNT_NAME as NAME,
			CASE COALESCE(A.ACCOUNT_SELS_TYPE, 2)
				WHEN 2 THEN 0
				WHEN 1 THEN 1
				WHEN 3 THEN 2
				ELSE 0
			END as STATUS,
			CAST(COALESCE(A.LIMIT_CASH, 0) AS DOUBLE PRECISION) as LIMIT_CASH,
			COALESCE(A.INV_TYPE, 1) as KIND,
			COALESCE(A.ACCOUNT_TEL1, '') as TEL1,
			COALESCE(A.ACCOUNT_TEL2, '') as TEL2,
			COALESCE(A.EMP_ID1, 0) as EMP_ID,
			COALESCE(A.EMP_ID4, 0) as EVENING_ID,
			COALESCE(A.EMP_ID8, 0) as DIST_ID,
			COALESCE(TRIM(E1.EMPLOYE_NAME), 'بدون') as EMP_NAME,
			COALESCE(TRIM(E4.EMPLOYE_NAME), 'بدون') as EVENING_NAME,
			COALESCE(TRIM(E8.EMPLOYE_NAME), 'بدون') as DIST_NAME
		FROM ACCOUNTS A
		LEFT JOIN EMPLOYE E1 ON A.EMP_ID1 = E1.EMPLOYE_ID
		LEFT JOIN EMPLOYE E4 ON A.EMP_ID4 = E4.EMPLOYE_ID
		LEFT JOIN EMPLOYE E8 ON A.EMP_ID8 = E8.EMPLOYE_ID
		WHERE A.ACCOUNT_ID > 0
	`
	args := []interface{}{limit, offset}

	if search != "" {
		query += " AND (A.ACCOUNT_NAME LIKE ? OR CAST(A.ACCOUNT_ID AS VARCHAR(50)) = ?)"
		args = append(args, "%"+search+"%", search)
	}

	query += " ORDER BY A.ACCOUNT_ID DESC"

	rows, err := db.FB.Query(query, args...)
	if err != nil {
		return []AdminPharmacy{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var p AdminPharmacy
		if err := rows.Scan(&p.ID, &p.Name, &p.Status, &p.Limit, &p.Kind, &p.Tel1, &p.Tel2, &p.EmpID, &p.EveningID, &p.DistID, &p.EmpName, &p.EveningName, &p.DistName); err != nil {
			log.Println("Admin GetPharmacies Scan error:", err)
			continue
		}
		pharmacies = append(pharmacies, p)
	}

	if pharmacies == nil {
		pharmacies = []AdminPharmacy{}
	}

	return pharmacies, nil
}

type AdminEmployee struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type EmployeesResponse struct {
	Reps   []AdminEmployee `json:"reps"`
	Dists  []AdminEmployee `json:"dists"`
	Others []AdminEmployee `json:"others"`
}

func (s *AdminService) GetEmployees() (EmployeesResponse, error) {
	resp := EmployeesResponse{
		Reps:   []AdminEmployee{},
		Dists:  []AdminEmployee{},
		Others: []AdminEmployee{},
	}

	rows, err := db.FB.Query("SELECT EMPLOYE_ID, TRIM(EMPLOYE_NAME) FROM EMPLOYE")
	if err != nil {
		log.Println("Error fetching employees:", err)
		return resp, nil
	}
	defer rows.Close()

	for rows.Next() {
		var emp AdminEmployee
		if err := rows.Scan(&emp.ID, &emp.Name); err == nil {
			resp.Reps = append(resp.Reps, emp)
			resp.Dists = append(resp.Dists, emp)
		}
	}

	return resp, nil
}

type UpdatePharmacyReq struct {
	Name      string  `json:"name"`
	Limit     float64 `json:"limit"`
	Kind      int     `json:"kind"`
	Tel1      string  `json:"tel1"`
	Tel2      string  `json:"tel2"`
	EmpID     int     `json:"emp_id"`
	EveningID int     `json:"evening_id"`
	DistID    int     `json:"dist_id"`
	Status    int     `json:"status"`
}

func (s *AdminService) UpdatePharmacy(id int, req UpdatePharmacyReq) error {
	// Map frontend status (0=متاح, 1=موقوف, 2=غير متعامل) to DB ACCOUNT_SELS_TYPE (2=متاح, 1=موقوف, 3=غير متعامل)
	dbStatus := 2 // default متاح
	if req.Status == 1 {
		dbStatus = 1
	} else if req.Status == 2 {
		dbStatus = 3
	}

	query := `
		UPDATE ACCOUNTS SET 
			ACCOUNT_NAME = ?,
			LIMIT_CASH = ?,
			INV_TYPE = ?,
			ACCOUNT_TEL1 = ?,
			ACCOUNT_TEL2 = ?,
			EMP_ID1 = ?,
			EMP_ID4 = ?,
			EMP_ID8 = ?,
			ACCOUNT_SELS_TYPE = ?
		WHERE ACCOUNT_ID = ?
	`
	_, err := db.FB.Exec(query, req.Name, req.Limit, req.Kind, req.Tel1, req.Tel2, req.EmpID, req.EveningID, req.DistID, dbStatus, id)
	return err
}

type AdminInvoiceDetail struct {
	ID          int     `json:"id"`
	AccountName string  `json:"account_name"`
	Date        string  `json:"date"`
	Total       float64 `json:"total"`
	IsClosed    bool    `json:"is_closed"`
}

func (s *AdminService) GetInvoiceByID(id int) (*AdminInvoiceDetail, error) {
	query := `
		SELECT H.INVOICES_H_ID, A.ACCOUNT_NAME, H.DATE_D, CAST(COALESCE(H.TOTAL_TOTAL, 0) AS DOUBLE PRECISION), COALESCE(H.CLOSE_, 0)
		FROM INVOICES_H H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE H.INVOICES_H_ID = ?
	`
	var inv AdminInvoiceDetail
	var dateBytes []byte
	var isClosed int
	err := db.FB.QueryRow(query, id).Scan(&inv.ID, &inv.AccountName, &dateBytes, &inv.Total, &isClosed)
	if err != nil {
		return nil, err
	}
	if len(dateBytes) > 10 {
		inv.Date = string(dateBytes[:10])
	} else {
		inv.Date = string(dateBytes)
	}
	inv.IsClosed = (isClosed == 1)
	return &inv, nil
}

func (s *AdminService) TransferInvoice(invoiceID, newAccountID int) error {
	// Update Header
	_, err := db.FB.Exec("UPDATE INVOICES_H SET ACCOUNT_ID = ? WHERE INVOICES_H_ID = ?", newAccountID, invoiceID)
	if err != nil {
		return err
	}
	
	// Update Details
	_, err = db.FB.Exec("UPDATE INVOICES_D SET ACCOUNT_ID = ? WHERE INVOICES_H_ID = ?", newAccountID, invoiceID)
	return err
}

func (s *AdminService) ReopenInvoice(invoiceID int) error {
	_, err := db.FB.Exec("UPDATE INVOICES_H SET CLOSE_ = 0, STORE_IN = 2, STORE_UP = 0 WHERE INVOICES_H_ID = ?", invoiceID)
	if err != nil {
		return err
	}
	_, err = db.FB.Exec("UPDATE INVOICES_D SET CO_CLOSE = 0 WHERE INVOICES_H_ID = ?", invoiceID)
	return err
}

func (s *AdminService) DeleteInvoiceItem(invoiceID, itemID int) error {
	_, err := db.FB.Exec("DELETE FROM INVOICES_D WHERE INVOICES_D_ID = ? AND INVOICES_H_ID = ?", itemID, invoiceID)
	if err != nil {
		return err
	}
	// Recalculate invoice total
	_, err = db.FB.Exec("UPDATE INVOICES_H SET TOTAL_TOTAL = COALESCE((SELECT SUM(TOTAL_TOTAL) FROM INVOICES_D WHERE INVOICES_H_ID = ?), 0) WHERE INVOICES_H_ID = ?", invoiceID, invoiceID)
	return err
}

type InventoryInvoice struct {
	ID         int     `json:"id"`
	Date       string  `json:"date"`
	Time       string  `json:"time"`
	Pharmacy   string  `json:"pharmacy"`
	Total      float64 `json:"total"`
	ItemsCount int     `json:"items_count"`
}

func (s *AdminService) GetInvoicesByInventoryStatus(storeID int, dateFrom, dateTo, timeFrom, timeTo, status string) ([]InventoryInvoice, error) {
	tsFrom := fmt.Sprintf("%s %s", dateFrom, timeFrom)
	tsTo := fmt.Sprintf("%s %s", dateTo, timeTo)

	query := `
		SELECT 
			H.INVOICES_H_ID, 
			H.DATE_D, 
			H.TIME_T, 
			COALESCE(A.ACCOUNT_NAME, 'مجهول'), 
			CAST(COALESCE(H.TOTAL_TOTAL, 0) AS DOUBLE PRECISION) as TOTAL,
			COALESCE(H.COUNT_PROD, 0) as ITEMS_COUNT
		FROM INVOICES_H H
		LEFT JOIN ACCOUNTS A ON H.ACCOUNT_ID = A.ACCOUNT_ID
		WHERE H.STORE_ID = ? 
		  AND (H.DATE_D + H.TIME_T) BETWEEN ? AND ?
		  AND H.TOTAL_TOTAL > 0
	`
	if status == "inventoried" {
		query += " AND H.STORE_IN = 1 AND H.STORE_UP = 1"
	} else if status == "open" {
		query += " AND H.CLOSE_ = 0"
	} else {
		query += " AND H.STORE_IN = 1 AND (H.STORE_UP <> 1 OR H.STORE_UP IS NULL)"
	}
	query += " ORDER BY H.INVOICES_H_ID DESC"

	rows, err := db.FB.Query(query, storeID, tsFrom, tsTo)
	if err != nil {
		log.Println("Error querying invoices by inventory status:", err)
		return []InventoryInvoice{}, err
	}
	defer rows.Close()

	var invoices []InventoryInvoice
	for rows.Next() {
		var inv InventoryInvoice
		var dateBytes []byte
		if err := rows.Scan(&inv.ID, &dateBytes, &inv.Time, &inv.Pharmacy, &inv.Total, &inv.ItemsCount); err != nil {
			log.Println("Scan error in GetInvoicesByInventoryStatus:", err)
			continue
		}
		
		if len(dateBytes) > 10 {
			inv.Date = string(dateBytes[:10])
		} else {
			inv.Date = string(dateBytes)
		}
		
		invoices = append(invoices, inv)
	}

	return invoices, nil
}
