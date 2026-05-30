package middleware

import (
	"errors"
	"net/http"
	"strings"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
	"tabarak-pharma-backend/internal/pkg/security"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AuthMiddleware(config *core.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Authentication required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Invalid authorization format"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := security.VerifyToken(tokenString, config.SecretKey)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Invalid or expired token"})
			c.Abort()
			return
		}

		if claims.Type != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Invalid token type"})
			c.Abort()
			return
		}

		var user models.User
		if err := db.DB.Preload("Pharmacies").Where("id = ?", claims.Subject).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusUnauthorized, gin.H{"detail": "User not found"})
			} else {
				// Distinguish DB error from User Not Found to prevent logout on transient DB issues
				c.JSON(http.StatusInternalServerError, gin.H{"detail": "Database connection error"})
			}
			c.Abort()
			return
		}

		if user.TokenVersion != claims.Version {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Token has been revoked"})
			c.Abort()
			return
		}

		if user.IsBlocked {
			c.JSON(http.StatusForbidden, gin.H{"detail": "User is blocked"})
			c.Abort()
			return
		}

		c.Set("user", &user)
		c.Next()
	}
}
