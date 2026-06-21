package repositories

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/models"
)

type PharmacyTier struct {
	Kind int `json:"kind"`
	Tier int `json:"tier"`
}

type AccountDetails struct {
	ID      string
	Name    string
	Address string
	Phone1  string
	Phone2  string
}

type PharmacyRepository struct{}

func NewPharmacyRepository() *PharmacyRepository {
	return &PharmacyRepository{}
}

func (r *PharmacyRepository) GetPharmacyTiers(pharmaCodes []int) (map[int]PharmacyTier, error) {
	if len(pharmaCodes) == 0 {
		return make(map[int]PharmacyTier), nil
	}

	placeholders := make([]string, len(pharmaCodes))
	args := make([]interface{}, len(pharmaCodes))
	for i, code := range pharmaCodes {
		placeholders[i] = "?"
		args[i] = code
	}

	query := fmt.Sprintf("SELECT ACCOUNT_ID, INV_TYPE, ACCOUNT_SELS_TYPE FROM ACCOUNTS WHERE ACCOUNT_ID IN (%s)", strings.Join(placeholders, ","))

	rows, err := db.FB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tiers := make(map[int]PharmacyTier)
	for rows.Next() {
		var accountID int
		var kind, tier sql.NullInt64
		if err := rows.Scan(&accountID, &kind, &tier); err != nil {
			continue
		}
		tiers[accountID] = PharmacyTier{
			Kind: int(kind.Int64),
			Tier: int(tier.Int64),
		}
		if tiers[accountID].Kind == 0 {
			tiers[accountID] = PharmacyTier{Kind: 4, Tier: tiers[accountID].Tier}
		}
		if tiers[accountID].Tier == 0 {
			tiers[accountID] = PharmacyTier{Kind: tiers[accountID].Kind, Tier: 1}
		}
	}

	return tiers, nil
}

func (r *PharmacyRepository) GetAccountDetails(code string) (*AccountDetails, []string, error) {
	query := `
		SELECT ACCOUNT_ID, ACCOUNT_NAME, ACCOUNT_ADDRESS, ACCOUNT_TEL1, ACCOUNT_TEL2 
		FROM ACCOUNTS 
		WHERE ACCOUNT_ID = ?
	`
	var details AccountDetails
	var name, address, phone1, phone2 sql.NullString

	err := db.FB.QueryRow(query, code).Scan(&details.ID, &name, &address, &phone1, &phone2)
	if err != nil {
		return nil, nil, err
	}

	details.Name = strings.TrimSpace(name.String)
	details.Address = strings.TrimSpace(address.String)
	details.Phone1 = strings.TrimSpace(phone1.String)
	details.Phone2 = strings.TrimSpace(phone2.String)

	// Get extra phones
	extraQuery := "SELECT TEL_ FROM TELE_PHON WHERE ACCOUNT_ID = ?"
	rows, err := db.FB.Query(extraQuery, code)
	extraPhones := make([]string, 0)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p sql.NullString
			if err := rows.Scan(&p); err == nil && p.Valid {
				extraPhones = append(extraPhones, strings.TrimSpace(p.String))
			}
		}
	}

	return &details, extraPhones, nil
}

func (r *PharmacyRepository) GetPharmacyAccountDetails(pharmaCode int) (map[string]interface{}, error) {
	query := "SELECT ACCOUNT_ID, INV_TYPE, ACCOUNT_SELS_TYPE, ACCOUNT_NAME FROM ACCOUNTS WHERE ACCOUNT_ID = ?"
	var accountID int
	var kind, tier sql.NullInt64
	var name sql.NullString
	
	err := db.FB.QueryRow(query, pharmaCode).Scan(&accountID, &kind, &tier, &name)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":   accountID,
		"kind": int(kind.Int64),
		"tier": int(tier.Int64),
		"name": strings.TrimSpace(name.String),
	}, nil
}

func (r *PharmacyRepository) GetCleanPharmaCodes(user *models.User) []int {
	var codes []int
	for _, p := range user.Pharmacies {
		if c, err := strconv.Atoi(p.Code); err == nil {
			codes = append(codes, c)
		}
	}
	return codes
}
