package employees

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

type EmployeeStats struct {
	Name          string `json:"name"`
	TotalItems    int     `json:"total_items"`
	InvoicesCount int     `json:"invoices_count"`
	TotalAmount   float64 `json:"total_amount"`
}

func GetMyStats(c *gin.Context) {
	userValue, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "غير مصرح لك"})
		return
	}

	user, ok := userValue.(*models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "بيانات المستخدم غير صالحة"})
		return
	}

	// Ensure user is allowed to access employee dashboard
	var hasEmployeeAccess bool
	for _, r := range user.Roles {
		if r.Name == "employee" || r.Name == "admin" || r.Name == "reviewer" {
			hasEmployeeAccess = true
			break
		}
	}
	if !hasEmployeeAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "غير مصرح لك للوصول إلى لوحة الموظف"})
		return
	}

	if user.Employee == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "لم يتم ربط حسابك بكود الموظف"})
		return
	}

	dateFrom := c.Query("dateFrom")
	dateTo := c.Query("dateTo")
	emp := user.Employee

	stats := &EmployeeStats{}

	// Employee is already preloaded by AuthMiddleware

	// Query Employee Name from EMPLOYE table
	var employeeName sql.NullString
	nameQuery := `SELECT TRIM(EMPLOYE_NAME) FROM EMPLOYE WHERE EMPLOYE_ID = ?`
	if err := db.FB.QueryRow(nameQuery, emp.FirebirdCode).Scan(&employeeName); err == nil && employeeName.Valid {
		stats.Name = employeeName.String
	}

	// Query Firebird for employee stats (EMP_ID10 is the reviewer column)
	query := `SELECT COUNT(INVOICES_H_ID), SUM(COUNT_PROD) FROM INVOICES_H WHERE EMP_ID10 = ?`
	var args []interface{}
	args = append(args, emp.FirebirdCode)

	if dateFrom != "" && dateTo != "" {
		query += ` AND DATE_D >= ? AND DATE_D <= ?`
		args = append(args, dateFrom, dateTo)
	}

	var count sql.NullInt64
	var items sql.NullInt64

	err := db.FB.QueryRow(query, args...).Scan(&count, &items)
	if err != nil {
		log.Println("Error fetching employee stats for employee", emp.ID, ":", err)
		// Return 0 values if not found or error
		c.JSON(http.StatusOK, stats)
		return
	}

	stats.InvoicesCount = int(count.Int64)
	stats.TotalItems = int(items.Int64)
	stats.TotalAmount = float64(stats.TotalItems) * 0.1

	c.JSON(http.StatusOK, stats)
}

type DailyProductivity struct {
	Date        string  `json:"date"`
	TotalItems  int     `json:"total_items"`
	TotalAmount float64 `json:"total_amount"`
}

func GetDailyProductivity(c *gin.Context) {
	userValue, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "غير مصرح لك"})
		return
	}

	user, ok := userValue.(*models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "بيانات المستخدم غير صالحة"})
		return
	}

	if user.Employee == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "لم يتم ربط حسابك بكود الموظف"})
		return
	}

	dateFrom := c.Query("dateFrom")
	dateTo := c.Query("dateTo")
	emp := user.Employee

	if emp.Role != "control" && emp.Role != "reviewer" {
		c.JSON(http.StatusOK, []DailyProductivity{})
		return
	}

	// Query Firebird for daily employee stats
	query := `SELECT CAST(DATE_D AS DATE) as date_val, SUM(COUNT_PROD) as total_items
			  FROM INVOICES_H 
			  WHERE EMP_ID10 = ? AND DATE_D >= ? AND DATE_D <= ?
			  GROUP BY CAST(DATE_D AS DATE)`
	
	rows, err := db.FB.Query(query, emp.FirebirdCode, dateFrom, dateTo)
	if err != nil {
		log.Println("Error fetching daily stats:", err)
		c.JSON(http.StatusOK, []DailyProductivity{})
		return
	}
	defer rows.Close()

	var results []DailyProductivity
	for rows.Next() {
		var dateVal string // Wait, CAST(DATE_D AS DATE) returns string representation? Let's use time.Time or string
		var items sql.NullInt64
		if err := rows.Scan(&dateVal, &items); err == nil {
			// Extract just the YYYY-MM-DD from dateVal if it contains time
			if len(dateVal) >= 10 {
				dateVal = dateVal[:10]
			}
			pItems := int(items.Int64)
			results = append(results, DailyProductivity{
				Date:        dateVal,
				TotalItems:  pItems,
				TotalAmount: float64(pItems) * 0.1,
			})
		}
	}

	c.JSON(http.StatusOK, results)
}
