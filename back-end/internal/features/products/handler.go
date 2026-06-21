package products

import (
	"net/http"
	"strconv"
	"tabarak-pharma-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	service *ProductService
}

func NewProductHandler() *ProductHandler {
	return &ProductHandler{
		service: NewProductService(),
	}
}

func (h *ProductHandler) Search(c *gin.Context) {
	search := c.Query("search")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	results, err := h.service.SearchProducts(search, limit, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل البحث عن المنتجات"})
		return
	}

	c.JSON(http.StatusOK, results)
}

func (h *ProductHandler) Recent(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	limit, _ := strconv.Atoi(limitStr)

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	results, err := h.service.GetRecentProducts(limit, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب المنتجات الحديثة"})
		return
	}

	c.JSON(http.StatusOK, results)
}

func (h *ProductHandler) GetHistory(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	limit, _ := strconv.Atoi(limitStr)

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	history, err := h.service.GetHistory(user.ID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل جلب سجل البحث"})
		return
	}

	c.JSON(http.StatusOK, history)
}

func (h *ProductHandler) AddHistory(c *gin.Context) {
	var input struct {
		Query string `json:"query" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "بيانات البحث مطلوبة"})
		return
	}

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	if err := h.service.AddHistory(user.ID, input.Query); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل إضافة البحث للسجل"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *ProductHandler) ClearHistory(c *gin.Context) {
	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	if err := h.service.ClearHistory(user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل مسح سجل البحث"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "تم مسح سجل البحث بنجاح"})
}
