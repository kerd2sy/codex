package pharmacy

import (
	"log"
	"net/http"
	"strconv"
	"tabarak-pharma-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type PurchaseHandler struct {
	service *PurchaseService
}

func NewPurchaseHandler() *PurchaseHandler {
	return &PurchaseHandler{
		service: NewPurchaseService(),
	}
}

func (h *PurchaseHandler) GetBalance(c *gin.Context) {
	pharmacyID := c.Query("pharmacy_id")
	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	balance, err := h.service.GetBalance(user, pharmacyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب رصيد الصيدلية"})
		return
	}

	c.JSON(http.StatusOK, balance)
}

func (h *PurchaseHandler) GetMyPurchases(c *gin.Context) {
	pharmacyID := c.Query("pharmacy_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	sort := c.DefaultQuery("sort", "desc")

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	purchases, err := h.service.GetMyPurchases(user, pharmacyID, page, limit, sort)
	if err != nil {
		log.Printf("GetMyPurchases Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب المشتريات"})
		return
	}

	log.Printf("[PurchaseHandler] GetMyPurchases found %d records for pharmacy %s (page %d)", len(purchases), pharmacyID, page)

	c.JSON(http.StatusOK, purchases)
}

func (h *PurchaseHandler) GetMyReturns(c *gin.Context) {
	pharmacyID := c.Query("pharmacy_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	sort := c.DefaultQuery("sort", "desc")

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	returns, err := h.service.GetMyReturns(user, pharmacyID, page, limit, sort)
	if err != nil {
		log.Printf("GetMyReturns Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب المرتجعات"})
		return
	}

	c.JSON(http.StatusOK, returns)
}

func (h *PurchaseHandler) GetCashFlow(c *gin.Context) {
	pharmacyID := c.Query("pharmacy_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	sort := c.DefaultQuery("sort", "desc")

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	cashFlow, err := h.service.GetCashFlow(user, pharmacyID, page, limit, sort)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب النقدية"})
		return
	}

	c.JSON(http.StatusOK, cashFlow)
}

func (h *PurchaseHandler) GetStatement(c *gin.Context) {
	pharmacyID := c.Query("pharmacy_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	dateFrom := c.Query("date_from")

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	statement, err := h.service.GetStatement(user, pharmacyID, page, limit, dateFrom)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب كشف الحساب"})
		return
	}

	c.JSON(http.StatusOK, statement)
}

func (h *PurchaseHandler) GetPurchaseDetail(c *gin.Context) {
	id := c.Param("id")
	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	detail, err := h.service.GetPurchaseDetail(user, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"detail": "الفاتورة غير موجودة"})
		return
	}

	c.JSON(http.StatusOK, detail)
}

func (h *PurchaseHandler) GetReturnDetail(c *gin.Context) {
	id := c.Param("id")
	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	detail, err := h.service.GetReturnDetail(user, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"detail": "المرتجع غير موجود"})
		return
	}

	c.JSON(http.StatusOK, detail)
}

func (h *PurchaseHandler) GetSaleDetail(c *gin.Context) {
	id := c.Param("id")
	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	detail, err := h.service.GetSaleDetail(user, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"detail": "الفاتورة غير موجودة"})
		return
	}

	c.JSON(http.StatusOK, detail)
}

type BatchDetailsRequest struct {
	IDs []string `json:"ids"`
}

func (h *PurchaseHandler) GetPurchaseDetailsBatch(c *gin.Context) {
	var req BatchDetailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "بيانات غير صالحة"})
		return
	}

	details, err := h.service.GetPurchaseDetailsBatch(req.IDs)
	if err != nil {
		log.Printf("❌ Batch Fetch Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب التفاصيل"})
		return
	}

	c.JSON(http.StatusOK, details)
}
