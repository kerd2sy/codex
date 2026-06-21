package admin

import (
	"database/sql"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"fmt"
	"time"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	Service *AdminService
}

func NewAdminHandler() *AdminHandler {
	return &AdminHandler{
		Service: NewAdminService(),
	}
}

func (h *AdminHandler) GetStats(c *gin.Context) {
	// Optional: You can check if the user is an admin here if not handled by middleware
	// userRole, exists := c.Get("user_role")
	// if !exists || userRole != "admin" { ... }

	stats, err := h.Service.GetDashboardStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch admin stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *AdminHandler) GetSales(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	sales, err := h.Service.GetSales(limit, offset, dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sales"})
		return
	}

	c.JSON(http.StatusOK, sales)
}

func (h *AdminHandler) GetSaleItems(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	items, err := h.Service.GetSaleItems(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sale items"})
		return
	}

	c.JSON(http.StatusOK, items)
}

func (h *AdminHandler) GetPharmacies(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	search := c.Query("search")
	kindStr := c.Query("kind")
	kind := -1
	if kindStr != "" {
		kind, _ = strconv.Atoi(kindStr)
	}

	pharmacies, err := h.Service.GetPharmacies(limit, offset, search, kind)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch pharmacies"})
		return
	}

	c.JSON(http.StatusOK, pharmacies)
}

func (h *AdminHandler) GetEmployees(c *gin.Context) {
	employees, err := h.Service.GetEmployees()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employees"})
		return
	}

	c.JSON(http.StatusOK, employees)
}

func (h *AdminHandler) GetEmployeesProductivity(c *gin.Context) {
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	
	empIDStr := c.Query("emp_id")
	empID := 0
	if empIDStr != "" {
		empID, _ = strconv.Atoi(empIDStr)
	}

	employees, err := h.Service.GetEmployeesProductivity(dateFrom, dateTo, empID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employees productivity"})
		return
	}

	c.JSON(http.StatusOK, employees)
}

func (h *AdminHandler) UpdatePharmacy(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid pharmacy ID"})
		return
	}

	var req UpdatePharmacyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Service.UpdatePharmacy(id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update pharmacy"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

func (h *AdminHandler) GetInvoiceByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	inv, err := h.Service.GetInvoiceByID(id)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoice"})
		}
		return
	}

	c.JSON(http.StatusOK, inv)
}

type TransferInvoiceReq struct {
	TargetAccountID int `json:"target_account_id" binding:"required"`
}

func (h *AdminHandler) TransferInvoice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var req TransferInvoiceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Service.TransferInvoice(id, req.TargetAccountID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to transfer invoice"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

func (h *AdminHandler) SendMassNotification(c *gin.Context) {
	var req MassNotificationReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Service.SendMassNotification(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send mass notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification sent successfully"})
}

func (h *AdminHandler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image uploaded"})
		return
	}

	uploadDir := filepath.Join("uploads", "notifications")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create upload directory"})
		return
	}

	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
	uploadPath := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save uploaded image"})
		return
	}

	imageUrl := fmt.Sprintf("/%s", strings.ReplaceAll(uploadPath, "\\", "/"))
	c.JSON(http.StatusOK, gin.H{"url": imageUrl})
}

func (h *AdminHandler) ReopenInvoice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	if err := h.Service.ReopenInvoice(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reopen invoice"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

func (h *AdminHandler) DeleteInvoiceItem(c *gin.Context) {
	invoiceIDStr := c.Param("id")
	invoiceID, err := strconv.Atoi(invoiceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	itemIDStr := c.Param("item_id")
	itemID, err := strconv.Atoi(itemIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID"})
		return
	}

	if err := h.Service.DeleteInvoiceItem(invoiceID, itemID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

func (h *AdminHandler) GetStatistics(c *gin.Context) {
	storeID, _ := strconv.Atoi(c.DefaultQuery("store_id", "1"))
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	timeFrom := c.DefaultQuery("time_from", "00:00:00")
	timeTo := c.DefaultQuery("time_to", "23:59:59")

	stats, err := h.Service.GetWarehouseStats(storeID, dateFrom, dateTo, timeFrom, timeTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch warehouse statistics"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *AdminHandler) GetStores(c *gin.Context) {
	stores, err := h.Service.GetStores()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stores"})
		return
	}
	c.JSON(http.StatusOK, stores)
}

func (h *AdminHandler) PrepareClosedInvoices(c *gin.Context) {
	storeID, _ := strconv.Atoi(c.DefaultQuery("store_id", "1"))
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	timeFrom := c.DefaultQuery("time_from", "00:00:00")
	timeTo := c.DefaultQuery("time_to", "23:59:59")

	if err := h.Service.PrepareClosedInvoices(storeID, dateFrom, dateTo, timeFrom, timeTo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare invoices"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

func (h *AdminHandler) GetInvoicesByInventoryStatus(c *gin.Context) {
	storeID, _ := strconv.Atoi(c.DefaultQuery("store_id", "1"))
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	timeFrom := c.DefaultQuery("time_from", "00:00:00")
	timeTo := c.DefaultQuery("time_to", "23:59:59")
	status := c.DefaultQuery("status", "uninventoried")

	invoices, err := h.Service.GetInvoicesByInventoryStatus(storeID, dateFrom, dateTo, timeFrom, timeTo, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoices"})
		return
	}

	c.JSON(http.StatusOK, invoices)
}

func (h *AdminHandler) GetUsers(c *gin.Context) {
	type UserWithRoles struct {
		ID           uint     `json:"id"`
		Email        string   `json:"email"`
		ManagerName  string   `json:"manager_name"`
		AvatarURL    string   `json:"avatar_url"`
		Roles        []string `json:"roles"`
		EmployeeRole string   `json:"employee_role"`
	}

	var users []models.User
	if err := db.DB.Preload("Roles").Preload("Employee").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	var response []UserWithRoles
	for _, u := range users {
		var roleNames []string
		for _, r := range u.Roles {
			roleNames = append(roleNames, r.Name)
		}

		empRole := ""
		if u.Employee != nil {
			empRole = u.Employee.Role
		}

		response = append(response, UserWithRoles{
			ID:           u.ID,
			Email:        u.Email,
			ManagerName:  u.ManagerName,
			AvatarURL:    u.AvatarURL,
			Roles:        roleNames,
			EmployeeRole: empRole,
		})
	}

	c.JSON(http.StatusOK, response)
}

func (h *AdminHandler) UpdateUserRoles(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		Roles        []string `json:"roles" binding:"required"`
		EmployeeRole string   `json:"employee_role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := db.DB.Preload("Employee").First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var roles []models.Role
	db.DB.Where("name IN ?", req.Roles).Find(&roles)
	db.DB.Model(&user).Association("Roles").Replace(roles)

	hasEmployeeRole := false
	for _, r := range req.Roles {
		if r == "employee" {
			hasEmployeeRole = true
			break
		}
	}

	if hasEmployeeRole && req.EmployeeRole != "" {
		if user.Employee != nil {
			// Update existing employee
			user.Employee.Role = req.EmployeeRole
			db.DB.Save(user.Employee)
		} else {
			// Create new employee link
			emp := models.Employee{
				UserID: &user.ID,
				Name:   user.ManagerName,
				Role:   req.EmployeeRole,
			}
			db.DB.Create(&emp)
		}
	} else if !hasEmployeeRole && user.Employee != nil {
		// If they are no longer an employee, we can optionally clear the role or unlink
		// For now, let's just clear the employee_role
		user.Employee.Role = ""
		db.DB.Save(user.Employee)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Roles updated successfully"})
}
