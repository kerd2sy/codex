package middleware

import (
	"net/http"
	"tabarak-pharma-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userCtx, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"detail": "User not found in context"})
			c.Abort()
			return
		}

		user, ok := userCtx.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Invalid user context"})
			c.Abort()
			return
		}

		isAllowed := false
		for _, role := range allowedRoles {
			if user.Role == role {
				isAllowed = true
				break
			}
		}

		if !isAllowed {
			c.JSON(http.StatusForbidden, gin.H{"detail": "You do not have permission to access this resource"})
			c.Abort()
			return
		}

		c.Next()
	}
}
