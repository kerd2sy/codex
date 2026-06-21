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
		// Check if user has one of the allowed roles in their roles array
		for _, role := range allowedRoles {
			// Check many2many roles
			for _, userRole := range user.Roles {
				if userRole.Name == role {
					isAllowed = true
					break
				}
			}
			if isAllowed {
				break
			}
			// Check employee job title
			if user.Employee != nil {
				empJobRole := user.Employee.Role
				// 'gomla' permission covers both 'gomla' and 'gomla_prep' job titles
				if role == "gomla" && (empJobRole == "gomla" || empJobRole == "gomla_prep") {
					isAllowed = true
					break
				}
				// Direct match for other job titles
				if empJobRole == role {
					isAllowed = true
					break
				}
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
