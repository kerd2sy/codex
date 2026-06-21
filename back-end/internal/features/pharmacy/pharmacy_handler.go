package pharmacy

import (
	"net/http"
	"strconv"
	"tabarak-pharma-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type PharmacyHandler struct {
	service *PharmacyService
}

func NewPharmacyHandler() *PharmacyHandler {
	return &PharmacyHandler{
		service: NewPharmacyService(),
	}
}

func (h *PharmacyHandler) LinkPharmacy(c *gin.Context) {
	var req LinkPharmacyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Fallback to path param for compatibility
		code := c.Param("code")
		if code != "" {
			req.Code = code
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"detail": "بيانات الربط غير مكتملة"})
			return
		}
	}

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	updatedUser, err := h.service.LinkPharmacyToUser(user, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

func (h *PharmacyHandler) UpdateLocation(c *gin.Context) {
	pharmacyIDStr := c.Param("pharmacy_id")
	pharmacyID, _ := strconv.ParseUint(pharmacyIDStr, 10, 32)

	var req struct {
		LocationURL string `json:"location_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "بيانات الموقع غير صالحة"})
		return
	}

	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	if err := h.service.UpdateLocation(user, uint(pharmacyID), req.LocationURL); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "تم تحديث الموقع بنجاح"})
}
