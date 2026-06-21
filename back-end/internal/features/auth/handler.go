package auth

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	service *AuthService
	config  *core.Config
}

func NewAuthHandler(config *core.Config) *AuthHandler {
	return &AuthHandler{
		service: NewAuthService(config),
		config:  config,
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input UserLogin
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "بيانات الدخول غير صالحة"})
		return
	}

	user, err := h.service.Authenticate(input)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": err.Error()})
		return
	}

	response, err := h.service.CreateTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل إنشاء رموز الدخول"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input UserCreate
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "بيانات التسجيل غير صالحة"})
		return
	}

	user, err := h.service.Register(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	// Automaticaly log in after registration by creating tokens
	response, err := h.service.CreateTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "تم إنشاء الحساب ولكن فشل تسجيل الدخول التلقائي"})
		return
	}

	c.JSON(http.StatusCreated, response)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var input struct {
		RefreshToken string `json:"refresh_token"`
	}

	// Try to get from body
	if err := c.ShouldBindJSON(&input); err != nil || input.RefreshToken == "" {
		// Fallback to Authorization header if not in body
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			input.RefreshToken = authHeader[7:] // Skip "Bearer "
		}
	}

	if input.RefreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "رمز التحديث مطلوب"})
		return
	}

	response, err := h.service.RefreshTokens(input.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "جلسة منتهية، يرجى إعادة تسجيل الدخول"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	response, err := h.service.EnrichUser(user)
	if err != nil {
		// Fallback to basic mapping if enrichment fails
		c.JSON(http.StatusOK, h.service.MapUserToResponse(user, nil))
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userValue, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "غير مصرح لك"})
		return
	}
	user := userValue.(*models.User)

	var input UserProfileUpdate
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "بيانات التحديث غير صالحة"})
		return
	}

	response, err := h.service.UpdateProfile(user, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) UpdateAvatar(c *gin.Context) {
	userValue, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "غير مصرح لك"})
		return
	}
	user := userValue.(*models.User)

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "لم يتم إرسال أي صورة"})
		return
	}

	// Create unique filename
	filename := fmt.Sprintf("avatar_%d_%s", user.ID, file.Filename)
	uploadPath := filepath.Join("uploads", "avatars", filename)
	
	// Ensure directory exists
	if err := os.MkdirAll(filepath.Join("uploads", "avatars"), 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل إنشاء مسار التخزين"})
		return
	}

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل حفظ الصورة"})
		return
	}

	avatarUrl := fmt.Sprintf("/%s", strings.ReplaceAll(uploadPath, "\\", "/"))
	
	// Update user in DB
	err = h.service.UpdateAvatarUrl(user, avatarUrl)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل تحديث الرابط في قاعدة البيانات"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"avatar_url": avatarUrl})
}

func (h *AuthHandler) Status(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "active",
		"auth":   "go-gin-jwt",
	})
}

func (h *AuthHandler) GoogleNative(c *gin.Context) {
	var input GoogleNativeLogin
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "ID Token مطلوب"})
		return
	}

	user, err := h.service.LoginWithGoogleToken(input.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": err.Error()})
		return
	}

	response, err := h.service.CreateTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل إنشاء الجلسة"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) Exchange(c *gin.Context) {
	var input ExchangeCode
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "كود التبادل مطلوب"})
		return
	}

	response, err := h.service.ExchangeTokens(input.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"detail": "كود التوثيق منتهي أو غير صالح"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) SyncTiers(c *gin.Context) {
	userValue, _ := c.Get("user")
	user := userValue.(*models.User)

	response, err := h.service.SyncTiers(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"detail": "فشل مزامنة الفئات"})
		return
	}

	c.JSON(http.StatusOK, response)
}

