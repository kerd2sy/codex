package notifications

import (
	"net/http"
	"strconv"
	"tabarak-pharma-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	service *NotificationService
}

func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{
		service: NewNotificationService(),
	}
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	app := c.Query("app")
	user, _ := c.Get("user")
	notifications, err := h.service.GetMyNotifications(user.(*models.User), app)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, notifications)
}

func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	user, _ := c.Get("user")
	count, err := h.service.GetUnreadCount(user.(*models.User))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *NotificationHandler) UpdatePushToken(c *gin.Context) {
	var body struct {
		Token     string `json:"token"`
		FCMToken  string `json:"fcmToken"`
		ExpoToken string `json:"expoToken"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Use expoToken if provided, otherwise fallback to token
	expo := body.ExpoToken
	if expo == "" {
		expo = body.Token
	}

	user, _ := c.Get("user")
	err := h.service.UpdatePushTokens(user.(*models.User), body.FCMToken, expo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)
	
	user, _ := c.Get("user")
	err := h.service.MarkAsRead(user.(*models.User), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	user, _ := c.Get("user")
	err := h.service.MarkAllAsRead(user.(*models.User))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *NotificationHandler) Dismiss(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)
	
	user, _ := c.Get("user")
	err := h.service.Dismiss(user.(*models.User), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *NotificationHandler) ClearAll(c *gin.Context) {
	user, _ := c.Get("user")
	err := h.service.ClearAll(user.(*models.User))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
