package middleware

import (
	"errors"
	"fmt"
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
			fmt.Printf("[AuthMiddleware] VerifyToken failed for token: %s... Error: %v\n", tokenString[:10], err)
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Invalid or expired token"})
			c.Abort()
			return
		}

		if claims.Type != "access" {
			fmt.Printf("[AuthMiddleware] Invalid token type: %s\n", claims.Type)
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "Invalid token type"})
			c.Abort()
			return
		}

		var user models.User
		if err := db.DB.Preload("Roles").Preload("Pharmacies").Preload("Employee").Where("id = ?", claims.Subject).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				fmt.Printf("[AuthMiddleware] User not found: %v\n", claims.Subject)
				c.JSON(http.StatusUnauthorized, gin.H{"detail": "User not found"})
			} else {
				fmt.Printf("[AuthMiddleware] DB Error: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{"detail": "Database connection error"})
			}
			c.Abort()
			return
		}

		if user.TokenVersion != claims.Version {
			fmt.Printf("[AuthMiddleware] Token revoked for user %v. DB Version: %d, Claims Version: %d\n", user.ID, user.TokenVersion, claims.Version)
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
