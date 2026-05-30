package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/features/pharmacy/repositories"
	"tabarak-pharma-backend/internal/models"
	"tabarak-pharma-backend/internal/pkg/security"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	config       *core.Config
	pharmacyRepo *repositories.PharmacyRepository
}

func NewAuthService(config *core.Config) *AuthService {
	return &AuthService{
		config:       config,
		pharmacyRepo: repositories.NewPharmacyRepository(),
	}
}

func (s *AuthService) Authenticate(loginData UserLogin) (*models.User, error) {
	var user models.User
	if err := db.DB.Preload("Pharmacies").Where("email = ?", loginData.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("البريد الإلكتروني أو كلمة المرور غير صحيحة")
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte(loginData.Password)); err != nil {
		user.FailedLoginAttempts++
		if user.FailedLoginAttempts >= 5 {
			user.IsLocked = true
		}
		db.DB.Save(&user)
		return nil, errors.New("البريد الإلكتروني أو كلمة المرور غير صحيحة")
	}

	if user.IsBlocked {
		return nil, errors.New("هذا الحساب محظور مسبقاً من الإدارة")
	}

	if user.IsLocked {
		return nil, errors.New("الحساب مقفل لكثرة المحاولات الخاطئة")
	}

	user.FailedLoginAttempts = 0
	db.DB.Save(&user)

	return &user, nil
}

func (s *AuthService) CreateTokens(user *models.User) (*TokenResponse, error) {
	accessToken, err := security.CreateToken(user.ID, user.TokenVersion, s.config.SecretKey, time.Hour*24, "access")
	if err != nil {
		return nil, err
	}

	refreshToken, err := security.CreateToken(user.ID, user.TokenVersion, s.config.SecretKey, time.Hour*24*7, "refresh")
	if err != nil {
		return nil, err
	}

	enrichedUser, err := s.EnrichUser(user)
	if err != nil {
		enrichedUser = s.MapUserToResponse(user, nil)
	}

	return &TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "bearer",
		User:         *enrichedUser,
	}, nil
}

func (s *AuthService) RefreshTokens(tokenString string) (*TokenResponse, error) {
	claims, err := security.VerifyToken(tokenString, s.config.SecretKey)
	if err != nil {
		return nil, errors.New("invalid or expired refresh token")
	}

	if claims.Type != "refresh" {
		return nil, errors.New("invalid token type")
	}

	var user models.User
	if err := db.DB.Preload("Pharmacies").Where("id = ?", claims.Subject).First(&user).Error; err != nil {
		return nil, errors.New("user not found")
	}

	if user.TokenVersion != claims.Version {
		return nil, errors.New("token has been revoked")
	}

	return s.CreateTokens(&user)
}

func (s *AuthService) MapUserToResponse(user *models.User, tiers map[int]repositories.PharmacyTier) *UserResponse {
	pharmacies := make([]PharmacyResponse, len(user.Pharmacies))
	for i, p := range user.Pharmacies {
		cleanCode := s.GetCleanPharmaCode(p.Code)
		tier, ok := tiers[cleanCode]
		if !ok {
			tier = repositories.PharmacyTier{Kind: 4, Tier: 1}
		}

		pharmacies[i] = PharmacyResponse{
			ID:          p.ID,
			Name:        p.Name,
			Code:        p.Code,
			Phone:       p.Phone,
			Phone2:      p.Phone2,
			Address:     p.Address,
			LocationURL: p.LocationURL,
			CreatedAt:   p.CreatedAt,
			Kind:        tier.Kind,
			Tier:        tier.Tier,
		}
	}

	return &UserResponse{
		ID:               user.ID,
		ManagerName:      user.ManagerName,
		Username:         user.Username,
		ManagerPhone:     user.ManagerPhone,
		AvatarURL:        user.AvatarURL,
		Role:             user.Role,
		Email:            user.Email,
		IsEmailVerified:  user.IsEmailVerified,
		IsBlocked:        user.IsBlocked,
		IsLocked:         user.IsLocked,
		CanCreateInvoice: user.CanCreateInvoice,
		PendingEmail:     user.PendingEmail,
		CreatedAt:        user.CreatedAt,
		Provider:         user.Provider,
		Pharmacies:       pharmacies,
	}
}

func (s *AuthService) GetCleanPharmaCode(code string) int {
	re := regexp.MustCompile(`\D`)
	clean := re.ReplaceAllString(code, "")
	val, _ := strconv.Atoi(clean)
	return val
}

func (s *AuthService) EnrichUser(user *models.User) (*UserResponse, error) {
	codes := make([]int, 0)
	for _, p := range user.Pharmacies {
		code := s.GetCleanPharmaCode(p.Code)
		if code > 0 {
			codes = append(codes, code)
		}
	}

	tiers, err := s.pharmacyRepo.GetPharmacyTiers(codes)
	if err != nil {
		return s.MapUserToResponse(user, nil), err
	}

	return s.MapUserToResponse(user, tiers), nil
}

func (s *AuthService) Register(userIn UserCreate) (*models.User, error) {
	var existing models.User
	if err := db.DB.Where("email = ?", userIn.Email).First(&existing).Error; err == nil {
		return nil, errors.New("البريد الإلكتروني مسجل بالفعل")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(userIn.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	username := userIn.Username
	if username == "" {
		username = userIn.Email
	}

	user := models.User{
		Email:          userIn.Email,
		HashedPassword: string(hashedPassword),
		ManagerName:    userIn.ManagerName,
		ManagerPhone:   userIn.ManagerPhone,
		Username:       username,
		Role:           "pharmacist",
	}

	if err := db.DB.Create(&user).Error; err != nil {
		return nil, err
	}

	if userIn.PharmacyCode != "" {
		var p models.Pharmacy
		if err := db.DB.Where("code = ?", userIn.PharmacyCode).First(&p).Error; err == nil {
			db.DB.Model(&user).Association("Pharmacies").Append(&p)
		}
	}

	return &user, nil
}

func (s *AuthService) LoginWithGoogleToken(idToken string) (*models.User, error) {
	// 1. Verify token with Google API
	resp, err := http.Get(fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken))
	if err != nil || resp.StatusCode != 200 {
		return nil, errors.New("فشل التحقق من توكن جوجل")
	}
	defer resp.Body.Close()

	var info map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}

	// 2. Logic Parity: Login or Register
	return s.LoginOrRegisterGoogle(info)
}

func (s *AuthService) LoginOrRegisterGoogle(info map[string]interface{}) (*models.User, error) {
	email, _ := info["email"].(string)
	if email == "" {
		return nil, errors.New("حساب جوجل هذا لا يحتوي على بريد إلكتروني")
	}
	email = strings.ToLower(email)
	googleID, _ := info["sub"].(string)
	name, _ := info["name"].(string)
	picture, _ := info["picture"].(string)

	// 1. Check GoogleUser link
	var googleUser models.GoogleUser
	if err := db.DB.Preload("User").Preload("User.Pharmacies").Where("google_id = ?", googleID).First(&googleUser).Error; err == nil {
		user := googleUser.User
		if user.AvatarURL == "" && picture != "" {
			user.AvatarURL = picture
			db.DB.Save(&user)
		}
		return &user, nil
	}

	// 2. Check User by email
	var user models.User
	if err := db.DB.Preload("Pharmacies").Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Register new user
			user = models.User{
				Email:           email,
				ManagerName:     name,
				Username:        strings.Split(email, "@")[0],
				AvatarURL:       picture,
				HashedPassword:  "oauth_" + uuid.New().String(),
				IsEmailVerified: true,
				Role:            "pharmacist",
				Provider:        "google",
			}
			if err := db.DB.Create(&user).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	// 3. Create/Link GoogleUser
	newGoogleUser := models.GoogleUser{
		GoogleID: googleID,
		UserID:   user.ID,
		Email:    email,
	}
	db.DB.Create(&newGoogleUser)

	return &user, nil
}

func (s *AuthService) SyncTiers(user *models.User) (*UserResponse, error) {
	return s.EnrichUser(user)
}

func (s *AuthService) ExchangeTokens(code string) (*TokenResponse, error) {
	tokens, err := GlobalExchangeStore.Pop(code)
	if err != nil {
		return nil, err
	}
	return tokens, nil
}

