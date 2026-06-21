package employees

import (
	"net/http"
	"strconv"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
	"github.com/gin-gonic/gin"
)

// CreateEmployeeLoan allows admin to add a new multi-month advance for an employee
func CreateEmployeeLoan(c *gin.Context) {
	employeeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee ID"})
		return
	}

	var input struct {
		TotalAmount        float64 `json:"total_amount"`
		MonthlyInstallment float64 `json:"monthly_installment"`
		Notes              string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.TotalAmount <= 0 || input.MonthlyInstallment <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "المبلغ والقسط يجب أن يكونا أكبر من صفر"})
		return
	}

	loan := models.EmployeeLoan{
		EmployeeID:         uint(employeeID),
		TotalAmount:        input.TotalAmount,
		MonthlyInstallment: input.MonthlyInstallment,
		RemainingAmount:    input.TotalAmount,
		IsActive:           true,
		Notes:              input.Notes,
	}

	if err := db.DB.Create(&loan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create loan"})
		return
	}

	c.JSON(http.StatusCreated, loan)
}

// GetEmployeeLoans lists all loans for a specific employee
func GetEmployeeLoans(c *gin.Context) {
	employeeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee ID"})
		return
	}

	var loans []models.EmployeeLoan
	if err := db.DB.Where("employee_id = ?", employeeID).Order("created_at desc").Find(&loans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch loans"})
		return
	}

	c.JSON(http.StatusOK, loans)
}

// DeleteEmployeeLoan deletes or cancels a loan
func DeleteEmployeeLoan(c *gin.Context) {
	loanID, err := strconv.Atoi(c.Param("loanId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid loan ID"})
		return
	}

	if err := db.DB.Delete(&models.EmployeeLoan{}, loanID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete loan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Loan deleted successfully"})
}
