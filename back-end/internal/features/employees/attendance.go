package employees

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

type AttendanceRecord struct {
	EmployeeID   uint       `json:"employee_id"`
	EmployeeName string     `json:"employee_name"`
	Role         string     `json:"role"`
	Status       string     `json:"status"` // "present", "absent", ""
	TimeIn       *time.Time `json:"time_in"`
	TimeOut      *time.Time `json:"time_out"`
	Notes        string     `json:"notes"`
	AttendanceID uint       `json:"attendance_id"`
}

func GetDailyAttendance(c *gin.Context) {
	dateStr := c.Query("date")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	// Fetch all employees
	var employees []models.Employee
	if err := db.DB.Find(&employees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employees"})
		return
	}

	// Fetch attendance records for this date
	var attendances []models.EmployeeAttendance
	if err := db.DB.Where("date = ?", dateStr).Find(&attendances).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance records"})
		return
	}

	// Map them together
	attendanceMap := make(map[uint]models.EmployeeAttendance)
	for _, att := range attendances {
		attendanceMap[att.EmployeeID] = att
	}

	var results []AttendanceRecord
	for _, emp := range employees {
		att, exists := attendanceMap[emp.ID]
		record := AttendanceRecord{
			EmployeeID:   emp.ID,
			EmployeeName: emp.Name,
			Role:         emp.Role,
		}
		if exists {
			record.Status = att.Status
			record.TimeIn = att.TimeIn
			record.TimeOut = att.TimeOut
			record.Notes = att.Notes
			record.AttendanceID = att.ID
		} else {
			record.Status = "" // Not recorded yet
		}
		results = append(results, record)
	}

	c.JSON(http.StatusOK, results)
}

type RecordAttendanceRequest struct {
	EmployeeID uint       `json:"employee_id" binding:"required"`
	Date       string     `json:"date" binding:"required"`
	Status     string     `json:"status" binding:"required"`
	TimeIn     *time.Time `json:"time_in"`
	Notes      string     `json:"notes"`
}

func RecordAttendance(c *gin.Context) {
	var req RecordAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "بيانات غير صالحة: " + err.Error()})
		return
	}

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

	// Find if record exists
	var att models.EmployeeAttendance
	err := db.DB.Where("employee_id = ? AND date = ?", req.EmployeeID, req.Date).First(&att).Error

	if err == nil {
		// Update existing
		att.Status = req.Status
		if req.TimeIn != nil {
			att.TimeIn = req.TimeIn
		}
		if req.Notes != "" {
			att.Notes = req.Notes
		}
		att.RecordedBy = user.ID
		
		if err := db.DB.Save(&att).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل في تحديث الحضور"})
			return
		}
	} else {
		// Create new
		att = models.EmployeeAttendance{
			EmployeeID: req.EmployeeID,
			Date:       req.Date,
			Status:     req.Status,
			TimeIn:     req.TimeIn,
			Notes:      req.Notes,
			RecordedBy: user.ID,
		}
		if err := db.DB.Create(&att).Error; err != nil {
			log.Println("Error creating attendance:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل في تسجيل الحضور"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "تم الحفظ بنجاح", "record": att})
}

func GetEmployeeAttendance(c *gin.Context) {
	employeeID := c.Param("id")

	var attendances []models.EmployeeAttendance
	// Fetch all records for this employee (or could limit to recent ones)
	query := db.DB.Where("employee_id = ?", employeeID).Order("date desc").Limit(100)

	if err := query.Find(&attendances).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance"})
		return
	}

	// The frontend AttendanceCalendar expects { "YYYY-MM-DD": "present", ... }
	attendanceMap := make(map[string]string)
	for _, att := range attendances {
		attendanceMap[att.Date] = att.Status
	}

	c.JSON(http.StatusOK, attendanceMap)
}
