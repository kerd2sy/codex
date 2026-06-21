package auth

import (
	"time"
)

type UserLogin struct {
	Email      string        `json:"email" binding:"required,email"`
	Password   string        `json:"password" binding:"required"`
}

type UserCreate struct {
	Email        string        `json:"email" binding:"required,email"`
	Password     string        `json:"password" binding:"required,min=2"`
	ManagerName  string        `json:"manager_name" binding:"required,min=3,max=100"`
	Username     string        `json:"username"`
	ManagerPhone string        `json:"manager_phone"`
	PharmacyCode string        `json:"pharmacy_code"`
}

type UserProfileUpdate struct {
	ManagerName  string `json:"manager_name"`
	ManagerPhone string `json:"manager_phone"`
	Email        string `json:"email"`
	AvatarURL    string `json:"avatar_url"`
}

type PharmacyResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Phone       string    `json:"phone"`
	Phone2      string    `json:"phone2"`
	Address     string    `json:"address"`
	LocationURL string    `json:"location_url"`
	CreatedAt   time.Time `json:"created_at"`
	Kind        int       `json:"kind"`
	Tier        int       `json:"tier"`
}

type UserResponse struct {
	ID                 uint               `json:"id"`
	ManagerName        string             `json:"manager_name"`
	Username           string             `json:"username"`
	ManagerPhone       string             `json:"manager_phone"`
	AvatarURL          string             `json:"avatar_url"`
	Email              string             `json:"email"`
	IsEmailVerified    bool               `json:"is_email_verified"`
	IsBlocked          bool               `json:"is_blocked"`
	IsLocked           bool               `json:"is_locked"`
	CanAccessEmployee  bool               `json:"can_access_employee"` // Kept for backward compatibility if needed, or derived from role
	EmployeeID         *uint              `json:"employee_id"`
	EmployeeRole       string             `json:"employee_role"`
	PendingEmail       string             `json:"pending_email"`
	CreatedAt          time.Time          `json:"created_at"`
	Provider           string             `json:"provider"`
	Roles              []string           `json:"roles"`
	Pharmacies         []PharmacyResponse `json:"pharmacies"`
}

type TokenResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	TokenType    string       `json:"token_type"`
	User         UserResponse `json:"user"`
}

type ExchangeCode struct {
	Code string `json:"code" binding:"required"`
}

type GoogleNativeLogin struct {
	IDToken string `json:"idToken" binding:"required"`
}

type PushTokenRequest struct {
	Token         string `json:"token"`
	ExpoPushToken string `json:"expo_push_token"`
	FCMToken      string `json:"fcm_token"`
	DeviceID      string `json:"device_id"`
	ExpoToken     string `json:"expoToken"`
	FCMTokenCamel string `json:"fcmToken"`
	DeviceToken   string `json:"deviceToken"`
	Platform      string `json:"platform"`
}
