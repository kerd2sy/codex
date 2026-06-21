package employees

import (
	"database/sql"
	"net/http"
	"strconv"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// SearchFirebird searches employees and accounts by name or ID
func SearchFirebird(c *gin.Context) {
	if db.FB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Firebird database not connected"})
		return
	}

	q := c.Query("q")
	if len(q) < 1 {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	query := `
		SELECT EMPLOYE_ID AS ID, TRIM(EMPLOYE_NAME) AS NAME, 'موظف' AS SOURCE 
		FROM EMPLOYE 
		WHERE EMPLOYE_NAME CONTAINING ? OR CAST(EMPLOYE_ID AS VARCHAR(50)) = ?
		UNION ALL
		SELECT ACCOUNT_ID AS ID, TRIM(ACCOUNT_NAME) AS NAME, 'عميل/حساب' AS SOURCE 
		FROM ACCOUNTS 
		WHERE ACCOUNT_NAME CONTAINING ? OR CAST(ACCOUNT_ID AS VARCHAR(50)) = ?
		ROWS 1 TO 20
	`

	rows, err := db.FB.Query(query, q, q, q, q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search firebird", "details": err.Error()})
		return
	}
	defer rows.Close()

	type FirebirdMatch struct {
		ID     string `json:"id"`
		Name   string `json:"name"`
		Source string `json:"source"`
	}

	var results []FirebirdMatch
	for rows.Next() {
		var match FirebirdMatch
		if err := rows.Scan(&match.ID, &match.Name, &match.Source); err == nil {
			results = append(results, match)
		}
	}

	c.JSON(http.StatusOK, results)
}

// GetSystemUsers returns all users from the Postgres database for linking
func GetSystemUsers(c *gin.Context) {
	type SystemUser struct {
		ID    uint   `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role,omitempty"`
	}

	var users []SystemUser
	// Fetch from users table
	if err := db.DB.Model(&models.User{}).Select("id", "manager_name as name", "email").Scan(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch system users"})
		return
	}

	c.JSON(http.StatusOK, users)
}

// GetEmployees returns all employees
func GetEmployees(c *gin.Context) {
	var employees []models.Employee
	if err := db.DB.Preload("User").Preload("User.Roles").Find(&employees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employees"})
		return
	}
	c.JSON(http.StatusOK, employees)
}

// CreateEmployee creates a new employee
func CreateEmployee(c *gin.Context) {
	var input struct {
		Name         string  `json:"name" binding:"required"`
		Phone        string  `json:"phone"`
		Address      string  `json:"address"`
		NationalID   string  `json:"national_id"`
		FirebirdCode string  `json:"firebird_code"`
		Role         string  `json:"role"`
		BaseSalary   float64 `json:"base_salary"`
		UserID       *uint   `json:"user_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employee := models.Employee{
		Name:         input.Name,
		Phone:        input.Phone,
		Address:      input.Address,
		NationalID:   input.NationalID,
		FirebirdCode: input.FirebirdCode,
		Role:         input.Role,
		BaseSalary:   input.BaseSalary,
		UserID:       input.UserID,
	}

	if err := db.DB.Create(&employee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create employee"})
		return
	}

	// Update user to be an employee
	if employee.UserID != nil {
		db.DB.Model(&models.User{}).Where("id = ?", *employee.UserID).Updates(map[string]interface{}{
			"employee_id": employee.ID,
		})
	}

	c.JSON(http.StatusCreated, employee)
}

// UpdateEmployee updates an existing employee
func UpdateEmployee(c *gin.Context) {
	id := c.Param("id")
	var employee models.Employee
	if err := db.DB.First(&employee, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	var input struct {
		Name         string  `json:"name"`
		Phone        string  `json:"phone"`
		Address      string  `json:"address"`
		NationalID   string  `json:"national_id"`
		FirebirdCode string  `json:"firebird_code"`
		Role         string   `json:"role"`
		BaseSalary   float64  `json:"base_salary"`
		UserID       *uint    `json:"user_id"`
		Roles        []string `json:"roles"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db.DB.Model(&employee).Updates(models.Employee{
		Name:         input.Name,
		Phone:        input.Phone,
		Address:      input.Address,
		NationalID:   input.NationalID,
		FirebirdCode: input.FirebirdCode,
		Role:         input.Role,
		BaseSalary:   input.BaseSalary,
		UserID:       input.UserID,
	})

	if input.UserID != nil {
		var user models.User
		if err := db.DB.Preload("Roles").First(&user, *input.UserID).Error; err == nil {
			db.DB.Model(&user).Updates(map[string]interface{}{
				"employee_id": employee.ID,
			})

			if input.Roles != nil {
				var roles []models.Role
				db.DB.Where("name IN ?", input.Roles).Find(&roles)
				db.DB.Model(&user).Association("Roles").Replace(roles)
			}
		}
	}

	c.JSON(http.StatusOK, employee)
}

// GetEmployeeMonthlyRecord gets the record for a specific employee and month
func GetEmployeeMonthlyRecord(c *gin.Context) {
	employeeID, _ := strconv.Atoi(c.Param("id"))
	monthYear := c.Param("month") // format "YYYY-MM"

	var emp models.Employee
	db.DB.First(&emp, employeeID)

	var record models.EmployeeMonthlyRecord
	var records []models.EmployeeMonthlyRecord
	db.DB.Where("employee_id = ? AND month_year = ?", employeeID, monthYear).Limit(1).Find(&records)
	
	if len(records) > 0 {
		record = records[0]
	} else {
		// If not found, we can return an empty structure so frontend can initialize
		record = models.EmployeeMonthlyRecord{
			EmployeeID: uint(employeeID),
			MonthYear:  monthYear,
			BaseSalary: emp.BaseSalary, // Default to their standard salary
		}
	}

	// Fetch dynamic debt from Firebird only if the record is not closed
	cycleStart, cycleEnd := getCycleDatesStr(monthYear)
	if !record.IsClosed && emp.FirebirdCode != "" && emp.FirebirdCode != "0" {
		var accountID string
		errFB := db.FB.QueryRow("SELECT ACCOUNT_ID FROM EMPLOYE WHERE EMPLOYE_ID = ?", emp.FirebirdCode).Scan(&accountID)
		if errFB == nil && accountID != "" && accountID != "0" {
			queryFB := `
				SELECT 
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_H WHERE ACCOUNT_ID = ?) as d1,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_HH WHERE ACCOUNT_ID = ?) as d2,
					(SELECT SUM(CAST(CASH AS DOUBLE PRECISION)) FROM PAY_CASH WHERE ACCOUNT_ID = ?) as d3,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM ORDER_R_H WHERE ACCOUNT_ID = ?) as d4,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM ORDER_H WHERE ACCOUNT_ID = ?) as c1,
					(SELECT SUM(CAST(CASH AS DOUBLE PRECISION)) FROM INCOME_CASH WHERE ACCOUNT_ID = ?) as c2,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_R_H WHERE ACCOUNT_ID = ?) as c3,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_RR_H WHERE ACCOUNT_ID = ?) as c4,
					(SELECT SUM(CAST(MBALANCE AS DOUBLE PRECISION)) FROM ACCOUNTS WHERE ACCOUNT_ID = ?) as mbal,
					(SELECT SUM(CAST(CASH AS DOUBLE PRECISION)) FROM PAY_CASH WHERE ACCOUNT_ID = ? AND DATE_D >= ? AND DATE_D <= ?) as d3_month,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_H WHERE ACCOUNT_ID = ? AND DATE_D >= ? AND DATE_D <= ?) as d1_month,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_HH WHERE ACCOUNT_ID = ? AND DATE_D >= ? AND DATE_D <= ?) as d2_month,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM ORDER_R_H WHERE ACCOUNT_ID = ? AND DATE_D >= ? AND DATE_D <= ?) as d4_month,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_R_H WHERE ACCOUNT_ID = ? AND DATE_D >= ? AND DATE_D <= ?) as c3_month,
					(SELECT SUM(CAST(TOTAL_TOTAL AS DOUBLE PRECISION)) FROM INVOICES_RR_H WHERE ACCOUNT_ID = ? AND DATE_D >= ? AND DATE_D <= ?) as c4_month,
					(SELECT SUM(CAST(CASH AS DOUBLE PRECISION)) FROM INCOME_CASH WHERE ACCOUNT_ID = ? AND DATE_D >= ? AND DATE_D <= ?) as c2_month
				FROM RDB$DATABASE`

			var d1, d2, d3, d4, c1, c2, c3, c4, mbal, d3_month, d1_month, d2_month, d4_month, c3_month, c4_month, c2_month *float64
			errQ := db.FB.QueryRow(queryFB, 
				accountID, accountID, accountID, accountID, accountID, accountID, accountID, accountID, accountID,
				accountID, cycleStart, cycleEnd,
				accountID, cycleStart, cycleEnd,
				accountID, cycleStart, cycleEnd,
				accountID, cycleStart, cycleEnd,
				accountID, cycleStart, cycleEnd,
				accountID, cycleStart, cycleEnd,
				accountID, cycleStart, cycleEnd).Scan(
				&d1, &d2, &d3, &d4, &c1, &c2, &c3, &c4, &mbal, &d3_month, &d1_month, &d2_month, &d4_month, &c3_month, &c4_month, &c2_month)
			
			if errQ == nil {
				var getVal = func(f *float64) float64 {
					if f == nil {
						return 0
					}
					return *f
				}

				goodsDebtCumulative := (getVal(d1) + getVal(d2) + getVal(d4)) - (getVal(c3) + getVal(c4))
				totalAdvanceEver := getVal(d3)
				totalPaidBack := getVal(c2)

				// Smart allocation: Pay off Goods Debt first, then Advances
				if totalPaidBack >= goodsDebtCumulative {
					totalPaidBack -= goodsDebtCumulative
					goodsDebtCumulative = 0
					totalAdvanceEver -= totalPaidBack
				} else {
					goodsDebtCumulative -= totalPaidBack
					totalPaidBack = 0
				}

				totalDebt := goodsDebtCumulative + totalAdvanceEver + getVal(mbal) - getVal(c1)

				// Sum active loans installments
				var activeInstallments float64
				var cycleLoansTotal float64
				db.DB.Model(&models.EmployeeLoan{}).
					Where("employee_id = ? AND remaining_amount > 0 AND is_active = ?", emp.ID, true).
					Select("COALESCE(SUM(monthly_installment), 0)").Scan(&activeInstallments)

				// Also sum total amounts of loans that were created during THIS cycle
				db.DB.Model(&models.EmployeeLoan{}).
					Where("employee_id = ? AND created_at >= ? AND created_at <= ?", emp.ID, cycleStart, cycleEnd+" 23:59:59").
					Select("COALESCE(SUM(total_amount), 0)").Scan(&cycleLoansTotal)

				// Advance taken THIS cycle (raw PAY_CASH)
				rawMonthlyAdvance := getVal(d3_month)
				pureAdvances := rawMonthlyAdvance - cycleLoansTotal
				if pureAdvances < 0 { pureAdvances = 0 }

				monthlyAdvance := pureAdvances + activeInstallments
				if monthlyAdvance < 0 { monthlyAdvance = 0 }

				// Goods taken THIS cycle
				monthlyGoodsDebt := (getVal(d1_month) + getVal(d2_month) + getVal(d4_month)) - (getVal(c3_month) + getVal(c4_month))
				if monthlyGoodsDebt < 0 { monthlyGoodsDebt = 0 }

				// Paid amount THIS cycle
				monthlyPaid := getVal(c2_month)

				record.RegisteredAdvance = monthlyAdvance
				record.GoodsDebt = monthlyGoodsDebt
				record.PaidAmount = monthlyPaid
				record.FirebirdTotalDebt = totalDebt

				// Productivity calculation for control
				if emp.Role == "control" || emp.Role == "reviewer" {
					var pCount, pItems sql.NullInt64
					pQuery := `SELECT COUNT(INVOICES_H_ID), SUM(COUNT_PROD) FROM INVOICES_H WHERE EMP_ID10 = ? AND DATE_D >= ? AND DATE_D <= ?`
					_ = db.FB.QueryRow(pQuery, emp.FirebirdCode, cycleStart, cycleEnd).Scan(&pCount, &pItems)
					record.ProductivityItems = int(pItems.Int64)
					record.ProductivityAmount = float64(record.ProductivityItems) * 0.1
				}
			}
		}

		var absentCount int64
		db.DB.Model(&models.EmployeeAttendance{}).
			Where("employee_id = ? AND date >= ? AND date <= ? AND (status = ? OR status = ?)", emp.ID, cycleStart, cycleEnd, "absent", "absent_unauthorized").
			Count(&absentCount)

		// Calculate Net Salary based on 30 days rule
		effectiveDays := 30.0 - float64(absentCount)
		if effectiveDays < 0 {
			effectiveDays = 0
		}
		dailyRate := emp.BaseSalary / 30.0
		baseForMonth := dailyRate * effectiveDays
		
		record.NetSalary = baseForMonth + record.Incentive + record.ProductivityAmount - record.Penalties - record.Delays - record.Damages - record.RegisteredAdvance - record.GoodsDebt

		if err := db.DB.Save(&record).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update record with Firebird data"})
			return
		}
	}

	c.JSON(http.StatusOK, record)
}

// SaveEmployeeMonthlyRecord saves or updates the monthly record
func SaveEmployeeMonthlyRecord(c *gin.Context) {
	employeeID, _ := strconv.Atoi(c.Param("id"))
	monthYear := c.Param("month")

	var input struct {
		BaseSalary        float64 `json:"base_salary"`
		Incentive         float64 `json:"incentive"`
		Damages           float64 `json:"damages"`
		Delays            float64 `json:"delays"`
		Penalties          float64 `json:"penalties"`
		ProductivityItems  int     `json:"productivity_items"`
		ProductivityAmount float64 `json:"productivity_amount"`
		RegisteredAdvance  float64 `json:"registered_advance"`
		FirebirdTotalDebt float64 `json:"firebird_total_debt"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate GoodsDebt based on Firebird total minus advances
	goodsDebt := input.FirebirdTotalDebt - input.RegisteredAdvance
	if goodsDebt < 0 {
		goodsDebt = 0 // Safeguard
	}

	var record models.EmployeeMonthlyRecord
	err := db.DB.Where("employee_id = ? AND month_year = ?", employeeID, monthYear).First(&record).Error

	if err != nil {
		// Create new
		record = models.EmployeeMonthlyRecord{
			EmployeeID:        uint(employeeID),
			MonthYear:         monthYear,
			BaseSalary:        input.BaseSalary,
			Incentive:         input.Incentive,
			Damages:           input.Damages,
			Delays:            input.Delays,
			Penalties:          input.Penalties,
			ProductivityItems:  input.ProductivityItems,
			ProductivityAmount: input.ProductivityAmount,
			RegisteredAdvance:  input.RegisteredAdvance,
			FirebirdTotalDebt: input.FirebirdTotalDebt,
			GoodsDebt:         goodsDebt,
		}
		db.DB.Create(&record)
	} else {
		// Update existing
		db.DB.Model(&record).Updates(map[string]interface{}{
			"base_salary":         input.BaseSalary,
			"incentive":           input.Incentive,
			"damages":             input.Damages,
			"delays":              input.Delays,
			"penalties":           input.Penalties,
			"productivity_items":  input.ProductivityItems,
			"productivity_amount": input.ProductivityAmount,
			"registered_advance":  input.RegisteredAdvance,
			"firebird_total_debt": input.FirebirdTotalDebt,
			"goods_debt":          goodsDebt,
			"net_salary":          input.BaseSalary + input.Incentive + input.ProductivityAmount - input.Penalties - input.Delays - input.Damages - input.RegisteredAdvance - goodsDebt,
		})
	}

	c.JSON(http.StatusOK, record)
}
