package employees

import (
	"database/sql"
	"fmt"
	"log"
	"time"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

// StartPayrollCron starts the background job to close payroll on 26th of each month
func StartPayrollCron() {
	go func() {
		for {
			now := time.Now()
			// Check if it's the 26th and after 8 AM
			if now.Day() == 26 && now.Hour() >= 8 {
				// The cycle that ended on the 25th belongs to the current month (e.g., May 26 - June 25 -> month_year = "2026-06")
				// So if today is June 26, we should close "2026-06".
				currentMonthStr := now.Format("2006-01")
				
				closePayrollForMonth(currentMonthStr)
			}
			
			// Sleep for an hour
			time.Sleep(1 * time.Hour)
		}
	}()
}

// StartDailyAttendanceCron starts the background job to automatically mark Thursdays as holidays
func StartDailyAttendanceCron() {
	go func() {
		for {
			now := time.Now()
			// Check if it's past midnight (between 00:00 and 01:00)
			if now.Hour() == 0 {
				// Yesterday's date
				yesterday := now.AddDate(0, 0, -1)
				// If yesterday was Thursday
				if yesterday.Weekday() == time.Thursday {
					dateStr := yesterday.Format("2006-01-02")
					autoMarkThursdayHoliday(dateStr)
				}
			}
			// Sleep for an hour
			time.Sleep(1 * time.Hour)
		}
	}()
}

func autoMarkThursdayHoliday(dateStr string) {
	// Fetch all employees
	var emps []models.Employee
	if err := db.DB.Find(&emps).Error; err != nil {
		log.Println("Error fetching employees for auto holiday:", err)
		return
	}

	// For each employee, check if they have an attendance record for yesterday
	for _, emp := range emps {
		var att models.EmployeeAttendance
		err := db.DB.Where("employee_id = ? AND date = ?", emp.ID, dateStr).First(&att).Error
		
		// If no record exists, create a holiday record
		if err != nil {
			newAtt := models.EmployeeAttendance{
				EmployeeID: emp.ID,
				Date:       dateStr,
				Status:     "holiday",
				Notes:      "إجازة تلقائية",
				RecordedBy: 0, // System
			}
			db.DB.Create(&newAtt)
		}
	}
	log.Println("Auto marked Thursday holidays for", dateStr)
}

func closePayrollForMonth(monthYear string) {
	var emps []models.Employee
	db.DB.Find(&emps)

	for _, emp := range emps {
		var record models.EmployeeMonthlyRecord
		err := db.DB.Where("employee_id = ? AND month_year = ?", emp.ID, monthYear).First(&record).Error
		
		if err != nil {
			record = models.EmployeeMonthlyRecord{
				EmployeeID: emp.ID,
				MonthYear:  monthYear,
				BaseSalary: emp.BaseSalary,
			}
		}

		if record.IsClosed {
			continue // Already closed
		}

		// Calculate final totals from Firebird
		cycleStart, cycleEnd := getCycleDatesStr(monthYear)
		
		if emp.FirebirdCode != "" && emp.FirebirdCode != "0" {
			var accountID string
			db.FB.QueryRow("SELECT ACCOUNT_ID FROM EMPLOYE WHERE EMPLOYE_ID = ?", emp.FirebirdCode).Scan(&accountID)
			
			if accountID != "" && accountID != "0" {
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

		record.IsClosed = true
		if record.ID == 0 {
			db.DB.Create(&record)
		} else {
			db.DB.Save(&record)
		}

		// Now decrement remaining amount for active loans
		var activeLoans []models.EmployeeLoan
		db.DB.Where("employee_id = ? AND remaining_amount > 0 AND is_active = ?", emp.ID, true).Find(&activeLoans)
		for _, loan := range activeLoans {
			loan.RemainingAmount -= loan.MonthlyInstallment
			if loan.RemainingAmount <= 0 {
				loan.RemainingAmount = 0
				loan.IsActive = false
			}
			db.DB.Save(&loan)
		}
	}
	
	log.Printf("Payroll for month %s has been closed successfully.", monthYear)
}

func getCycleDatesStr(monthYear string) (string, string) {
	// monthYear is YYYY-MM. The cycle ends on the 25th of this month. Starts 26th of prev month.
	t, err := time.Parse("2006-01", monthYear)
	if err != nil {
		now := time.Now()
		return fmt.Sprintf("%04d-%02d-26", now.Year(), now.Month()-1), fmt.Sprintf("%04d-%02d-25", now.Year(), now.Month())
	}
	
	endYear, endMonth := t.Year(), t.Month()
	
	startT := t.AddDate(0, -1, 0)
	startYear, startMonth := startT.Year(), startT.Month()
	
	return fmt.Sprintf("%04d-%02d-26", startYear, startMonth), fmt.Sprintf("%04d-%02d-25", endYear, endMonth)
}
