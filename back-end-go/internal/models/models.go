package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID                  uint           `gorm:"primaryKey" json:"id"`
	ManagerName         string         `gorm:"size:100;not null" json:"manager_name"`
	Username            string         `gorm:"size:50;uniqueIndex" json:"username"`
	ManagerPhone        string         `gorm:"size:20" json:"manager_phone"`
	AvatarURL           string         `gorm:"size:255" json:"avatar_url"`
	Role                string         `gorm:"size:50;default:pharmacist" json:"role"`
	Email               string         `gorm:"size:100;uniqueIndex;not null" json:"email"`
	IsEmailVerified     bool           `gorm:"default:false" json:"is_email_verified"`
	IsBlocked           bool           `gorm:"default:false" json:"is_blocked"`
	IsLocked            bool           `gorm:"default:false" json:"is_locked"`
	FailedLoginAttempts int            `gorm:"default:0" json:"failed_login_attempts"`
	HashedPassword      string         `gorm:"size:255;not null" json:"-"`
	OTPCode             string         `gorm:"size:10" json:"-"`
	ResetPasswordToken  string         `gorm:"size:255" json:"-"`
	PendingEmail        string         `gorm:"size:100" json:"pending_email"`
	ExpoPushToken       string         `gorm:"size:255" json:"expo_push_token"`
	FCMToken            string         `gorm:"size:255" json:"fcm_token"`
	TokenVersion        int            `gorm:"default:1" json:"token_version"`
	CanCreateInvoice    bool           `gorm:"default:false" json:"can_create_invoice"`
	CreatedAt           time.Time      `json:"created_at"`
	Provider            string         `gorm:"size:50;default:email" json:"provider"`
	BiometricPublicKey  string         `gorm:"size:1000" json:"biometric_public_key"`
	BiometricNonce      string         `gorm:"size:100" json:"biometric_nonce"`
	Pharmacies          []Pharmacy     `gorm:"many2many:user_pharmacies;" json:"pharmacies"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}

type Pharmacy struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Code        string         `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Phone       string         `gorm:"size:20" json:"phone"`
	Phone2      string         `gorm:"size:20" json:"phone2"`
	Address     string         `gorm:"size:500" json:"address"`
	LocationURL string         `gorm:"size:500" json:"location_url"`
	CreatedAt   time.Time      `json:"created_at"`
	Users       []User         `gorm:"many2many:user_pharmacies;" json:"users"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type GoogleUser struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	GoogleID string `gorm:"size:255;uniqueIndex;not null" json:"google_id"`
	UserID   uint   `gorm:"index;not null" json:"user_id"`
	User     User   `gorm:"foreignKey:UserID" json:"user"`
	Email    string `gorm:"size:255" json:"email"`
}

type Device struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Name       string    `gorm:"size:100;not null" json:"name"`
	Model      string    `gorm:"size:100" json:"model"`
	Platform   string    `gorm:"size:50" json:"platform"`
	LastActive time.Time `json:"last_active"`
	UserID     uint      `gorm:"index" json:"user_id"`
	Status     string    `gorm:"size:50;default:نشط الآن" json:"status"`
	Location   string    `gorm:"size:255" json:"location"`
	IPAddress  string    `gorm:"size:50" json:"ip_address"`
	IsCurrent  bool      `gorm:"default:false" json:"is_current"`
	Icon       string    `gorm:"size:50;default:smartphone-outline" json:"icon"`
}

type Notification struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"size:255;not null" json:"title"`
	Description string    `gorm:"size:500" json:"description"`
	Icon        string    `gorm:"size:50;default:notifications-outline" json:"icon"`
	Color       string    `gorm:"size:20;default:#3949AB" json:"color"`
	Unread      bool      `gorm:"default:true" json:"unread"`
	IsDismissed bool      `gorm:"default:false" json:"is_dismissed"`
	UserID      *uint     `gorm:"index:idx_user_target" json:"user_id"`
	PharmacyID  *uint     `json:"pharmacy_id"`
	Type        string    `gorm:"size:50" json:"type"`
	TargetID    string    `gorm:"size:100;index:idx_user_target" json:"target_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type LoginActivity struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Title     string    `gorm:"size:100;not null" json:"title"`
	Timestamp time.Time `json:"timestamp"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Device    string    `gorm:"size:100" json:"device"`
	Status    string    `gorm:"size:50" json:"status"`
	Location  string    `gorm:"size:255" json:"location"`
}

type UserPaymentMethod struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	UserID        uint      `gorm:"index" json:"user_id"`
	MethodType    string    `gorm:"size:50;not null" json:"method_type"`
	Provider      string    `gorm:"size:50" json:"provider"`
	HolderName    string    `gorm:"size:255" json:"holder_name"`
	ExpiryDate    string    `gorm:"size:10" json:"expiry_date"`
	LastFour      string    `gorm:"size:20" json:"last_four"`
	EncryptedData string    `gorm:"size:1000" json:"-"`
	IsDefault     bool      `gorm:"default:false" json:"is_default"`
	CreatedAt     time.Time `json:"created_at"`
}

type ProductSearchHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Query     string    `gorm:"size:255;not null" json:"query"`
	CreatedAt time.Time `json:"created_at"`
}
