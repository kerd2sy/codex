package models

import (
	"time"

	"gorm.io/gorm"
)

type Role struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Name        string `gorm:"size:50;uniqueIndex;not null" json:"name"`
	Description string `gorm:"size:255" json:"description"`
}

type User struct {
	ID                  uint           `gorm:"primaryKey" json:"id"`
	ManagerName         string         `gorm:"size:100;not null" json:"manager_name"`
	Username            string         `gorm:"size:50;uniqueIndex" json:"username"`
	ManagerPhone        string         `gorm:"size:20" json:"manager_phone"`
	AvatarURL           string         `gorm:"size:255" json:"avatar_url"`
	Email               string         `gorm:"size:100;uniqueIndex;not null" json:"email"`
	IsEmailVerified     bool           `gorm:"default:true" json:"is_email_verified"`
	IsBlocked           bool           `gorm:"default:false" json:"is_blocked"`
	IsLocked            bool           `gorm:"default:false" json:"is_locked"`
	FailedLoginAttempts int            `gorm:"default:0" json:"failed_login_attempts"`
	HashedPassword      string         `gorm:"size:255;not null" json:"-"`
	ResetPasswordToken  string         `gorm:"size:255" json:"-"`
	PendingEmail        string         `gorm:"size:100" json:"pending_email"`
	ExpoPushToken       string         `gorm:"size:255" json:"expo_push_token"`
	FCMToken            string         `gorm:"size:255" json:"fcm_token"`
	TokenVersion        int            `gorm:"default:1" json:"token_version"`
	CreatedAt           time.Time      `json:"created_at"`
	Provider            string         `gorm:"size:50;default:email" json:"provider"`
	BiometricPublicKey  string         `gorm:"size:1000" json:"biometric_public_key"`
	BiometricNonce      string         `gorm:"size:100" json:"biometric_nonce"`
	Employee            *Employee      `gorm:"foreignKey:UserID" json:"employee,omitempty"`
	Pharmacies          []Pharmacy     `gorm:"many2many:user_pharmacies;" json:"pharmacies"`
	Roles               []Role         `gorm:"many2many:user_roles;" json:"roles"`
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


type Notification struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"size:255;not null" json:"title"`
	Description string    `gorm:"size:500" json:"description"`
	Icon        string    `gorm:"size:50;default:notifications-outline" json:"icon"`
	Color       string    `gorm:"size:20;default:#3949AB" json:"color"`
	ImageUrl    string    `gorm:"size:1000" json:"image_url"`
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


type ProductSearchHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Query     string    `gorm:"size:255;not null" json:"query"`
	CreatedAt time.Time `json:"created_at"`
}

type ProductBatchHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ProdID    string    `gorm:"size:100;index" json:"prod_id"`
	Batch     string    `gorm:"size:100" json:"batch"`
	Expiry    string    `gorm:"size:50" json:"expiry"`
	UserID    uint      `gorm:"index" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
}

type InvoiceAuditRecord struct {
	InvoiceID         int       `gorm:"primaryKey" json:"invoice_id"`
	Status            string    `gorm:"size:50" json:"status"` // "editing", "audited"
	EditingByUserID   *uint     `gorm:"index" json:"editing_by_user_id"`
	EditingByUserName string    `gorm:"size:100" json:"editing_by_user_name"`
	AuditedByUserID   *uint     `gorm:"index" json:"audited_by_user_id"`
	AuditedByUserName string    `gorm:"size:100" json:"audited_by_user_name"`
	StartedAt         *time.Time `json:"started_at"`
	FinishedAt        *time.Time `json:"finished_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type ItemAuditRecord struct {
	ItemID             int       `gorm:"primaryKey" json:"item_id"`
	PreparedByUserID   *uint     `gorm:"index" json:"prepared_by_user_id"`
	PreparedByUserName string    `gorm:"size:100" json:"prepared_by_user_name"`
	ModifiedByUserID   *uint     `gorm:"index" json:"modified_by_user_id"`
	ModifiedByUserName string    `gorm:"size:100" json:"modified_by_user_name"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type Employee struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       *uint          `gorm:"index" json:"user_id"` // Optional link to User
	User         *User          `gorm:"foreignKey:UserID" json:"User,omitempty"`
	Name         string         `gorm:"size:255;not null" json:"name"`
	Phone        string         `gorm:"size:20" json:"phone"`
	Address      string         `gorm:"size:500" json:"address"`
	NationalID   string         `gorm:"size:50" json:"national_id"`
	FirebirdCode string         `gorm:"size:50" json:"firebird_code"`
	Role         string         `gorm:"size:50" json:"role"`
	BaseSalary   float64        `gorm:"type:decimal(10,2);default:0" json:"base_salary"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type EmployeeMonthlyRecord struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	EmployeeID         uint      `gorm:"index;not null" json:"employee_id"`
	MonthYear          string    `gorm:"size:20;not null;index" json:"month_year"` // e.g. "2026-05"
	BaseSalary         float64   `gorm:"type:decimal(10,2);default:0" json:"base_salary"`
	Incentive          float64   `gorm:"type:decimal(10,2);default:0" json:"incentive"`
	Damages            float64   `gorm:"type:decimal(10,2);default:0" json:"damages"`
	Delays             float64   `gorm:"type:decimal(10,2);default:0" json:"delays"`
	Penalties          float64   `gorm:"type:decimal(10,2);default:0" json:"penalties"`
	ProductivityItems  int       `gorm:"default:0" json:"productivity_items"`
	ProductivityAmount float64   `gorm:"default:0" json:"productivity_amount"`
	RegisteredAdvance  float64   `gorm:"type:decimal(10,2);default:0" json:"registered_advance"`
	PaidAmount         float64   `gorm:"type:decimal(10,2);default:0" json:"paid_amount"`
	FirebirdTotalDebt  float64   `gorm:"type:decimal(10,2);default:0" json:"firebird_total_debt"`
	GoodsDebt          float64   `gorm:"type:decimal(10,2);default:0" json:"goods_debt"`
	NetSalary          float64   `gorm:"type:decimal(10,2);default:0" json:"net_salary"`
	IsClosed           bool      `gorm:"default:false" json:"is_closed"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type EmployeeAttendance struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	EmployeeID uint       `gorm:"index;not null" json:"employee_id"`
	Date       string     `gorm:"size:10;index;not null" json:"date"` // e.g., "2026-06-06"
	Status     string     `gorm:"size:20;not null" json:"status"`     // "present", "absent"
	TimeIn     *time.Time `json:"time_in"`
	TimeOut    *time.Time `json:"time_out"`
	Notes      string     `gorm:"size:500" json:"notes"`
	RecordedBy uint       `gorm:"index" json:"recorded_by"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type EmployeeLoan struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	EmployeeID         uint      `gorm:"index;not null" json:"employee_id"`
	TotalAmount        float64   `gorm:"type:decimal(10,2);not null" json:"total_amount"`
	MonthlyInstallment float64   `gorm:"type:decimal(10,2);not null" json:"monthly_installment"`
	RemainingAmount    float64   `gorm:"type:decimal(10,2);not null" json:"remaining_amount"`
	IsActive           bool      `gorm:"default:true" json:"is_active"`
	Notes              string    `gorm:"size:500" json:"notes"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}
