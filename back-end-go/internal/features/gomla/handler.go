package gomla

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
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

type UpdateItemRequest struct {
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

	err = h.service.UpdateItemBatchAndExpiry(dID, req.Batch, req.Expiry, req.Qty)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update item", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item updated successfully"})
}
