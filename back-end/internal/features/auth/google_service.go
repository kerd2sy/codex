package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GoogleUserInfo struct {
	Sub     string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

type GoogleAuthService struct {
	config      *core.Config
	authService *AuthService
}

func NewGoogleAuthService(config *core.Config) *GoogleAuthService {
	return &GoogleAuthService{
		config:      config,
		authService: NewAuthService(config),
	}
}

func (s *GoogleAuthService) VerifyGoogleIDToken(idToken string) (*GoogleUserInfo, error) {
	url := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("failed to verify google id token")
	}

	var info GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}

	return &info, nil
}

func (s *GoogleAuthService) LoginOrRegisterGoogle(info *GoogleUserInfo) (*models.User, error) {
	email := strings.ToLower(info.Email)
	if email == "" {
		return nil, errors.New("حساب جوجل هذا لا يحتوي على بريد إلكتروني")
	}

	var user models.User
	// 1. Try to find by email
	if err := db.DB.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 2. Create new user
			user = models.User{
				Email:           email,
				ManagerName:     info.Name,
				Username:        strings.Split(email, "@")[0],
				AvatarURL:       info.Picture,
				HashedPassword:  "oauth_" + uuid.New().String(),
				IsEmailVerified: true,
				Provider:        "google",
			}
			if err := db.DB.Create(&user).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	} else {
		// Existing user, update provider
		user.Provider = "google"
		if user.AvatarURL == "" {
			user.AvatarURL = info.Picture
		}
		db.DB.Save(&user)
	}

	return &user, nil
}
