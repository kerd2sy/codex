package gomla

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"tabarak-pharma-backend/internal/models"
)

type GomlaHandler struct {
	service *GomlaService
}

func NewGomlaHandler() *GomlaHandler {
	return &GomlaHandler{
		service: NewGomlaService(),
	}
}

func (h *GomlaHandler) GetInvoice(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	details, err := h.service.GetInvoiceDetail(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoice details", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, details)
}

func (h *GomlaHandler) GetRecentInvoices(c *gin.Context) {
	// If today=true, return ALL invoices from today (no limit)
	limitStr := c.DefaultQuery("limit", "10")
	dateStr := c.Query("date")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	invoices, err := h.service.GetRecentInvoices(limit, dateStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recent invoices"})
		return
	}

	c.JSON(http.StatusOK, invoices)
}

type UpdateItemRequest struct {
	ProdID string  `json:"prod_id"`
	Batch  string  `json:"batch" binding:"required"`
	Expiry string  `json:"expiry" binding:"required"`
	Qty    float64 `json:"qty"`
}

func (h *GomlaHandler) UpdateInvoiceItem(c *gin.Context) {
	dIDParam := c.Param("itemId")
	dID, err := strconv.Atoi(dIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID"})
		return
	}

	var req UpdateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	var userID uint
	var userName string
	if userInterface, exists := c.Get("user"); exists {
		if user, ok := userInterface.(*models.User); ok {
			userID = user.ID
			userName = user.ManagerName
		}
	}

	err = h.service.UpdateItemBatchAndExpiry(dID, req.Batch, req.Expiry, req.Qty, userID, userName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update item", "details": err.Error()})
		return
	}

	// Try to save to Postgres history
	if req.ProdID != "" {
		_ = h.service.SaveBatchHistory(req.ProdID, req.Batch, req.Expiry, userID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item updated successfully"})
}

func (h *GomlaHandler) GetProductBatchHistory(c *gin.Context) {
	prodID := c.Param("prod_id")
	if prodID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	history, err := h.service.GetProductBatchHistory(prodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
		return
	}

	c.JSON(http.StatusOK, history)
}

func (h *GomlaHandler) GetProductStockBalance(c *gin.Context) {
	prodID := c.Param("prod_id")
	if prodID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	balance, err := h.service.GetProductStockBalance(prodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stock balance"})
		return
	}

	c.JSON(http.StatusOK, balance)
}

func (h *GomlaHandler) UpdateInvoiceAuditStatus(c *gin.Context) {
	invoiceIDStr := c.Param("id")
	invoiceID, err := strconv.Atoi(invoiceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"` // "editing", "audited", "clear"
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	user, ok := userInterface.(*models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user context"})
		return
	}

	userID := user.ID
	userName := user.ManagerName

	err = h.service.UpdateInvoiceAuditStatus(invoiceID, req.Status, userID, userName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update audit status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Audit status updated successfully"})
}

func (h *GomlaHandler) GetTopPreparers(c *gin.Context) {
	dateStr := c.Query("date")
	preparers, err := h.service.GetTopPreparers(dateStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch top preparers", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, preparers)
}

