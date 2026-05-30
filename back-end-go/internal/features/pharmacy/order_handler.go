package pharmacy

import (
	"net/http"
	"strconv"
	"tabarak-pharma-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	service *OrderService
}

func NewOrderHandler() *OrderHandler {
	return &OrderHandler{
		service: NewOrderService(),
	}
}

func (h *OrderHandler) GetMyOrders(c *gin.Context) {
	pharmacyID := c.Query("pharmacy_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	sort := c.DefaultQuery("sort", "desc")

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	orders, err := h.service.GetMyOrders(user, pharmacyID, page, limit, sort)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب الطلبات"})
		return
	}

	c.JSON(http.StatusOK, orders)
}

func (h *OrderHandler) GetMySales(c *gin.Context) {
	pharmacyID := c.Query("pharmacy_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	sort := c.DefaultQuery("sort", "desc")

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	sales, err := h.service.GetMySales(user, pharmacyID, page, limit, sort)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب المبيعات"})
		return
	}

	c.JSON(http.StatusOK, sales)
}
