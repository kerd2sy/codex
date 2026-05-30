package services

import (
	"math"
	"regexp"
	"strconv"
	"tabarak-pharma-backend/internal/features/pharmacy/repositories"
	"tabarak-pharma-backend/internal/models"
)

type PurchaseService struct {
	purchaseRepo *repositories.PurchaseRepository
}

func NewPurchaseService() *PurchaseService {
	return &PurchaseService{
		purchaseRepo: repositories.NewPurchaseRepository(),
	}
}

type BalanceSummary struct {
	CurrentBalance  float64 `json:"currentBalance"`
	BalanceType     string  `json:"balanceType"`
	CreditLimit     float64 `json:"creditLimit"`
	UsagePercentage float64 `json:"usagePercentage"`
	NetBalance      float64 `json:"netBalance"`
}

func (s *PurchaseService) GetCleanPharmaCodes(user *models.User, pharmacyID string) []int {
	codes := make([]int, 0)
	re := regexp.MustCompile(`\D`)

	for _, p := range user.Pharmacies {
		if pharmacyID != "" && strconv.Itoa(int(p.ID)) != pharmacyID {
			continue
		}
		clean := re.ReplaceAllString(p.Code, "")
		val, _ := strconv.Atoi(clean)
		if val > 0 {
			codes = append(codes, val)
		}
	}
	return codes
}

func (s *PurchaseService) GetBalance(user *models.User, pharmacyID string) (*BalanceSummary, error) {
	codes := s.GetCleanPharmaCodes(user, pharmacyID)
	if len(codes) == 0 {
		return &BalanceSummary{
			BalanceType: "Credit",
		}, nil
	}

	balance, limit, err := s.purchaseRepo.GetBalance(codes)
	if err != nil {
		return nil, err
	}

	if limit == 0 {
		limit = 5000.0
	}

	balanceType := "Credit"
	if balance >= 0 {
		balanceType = "Debit"
	}

	usage := 0.0
	if limit > 0 {
		usage = (math.Abs(balance) / limit) * 100
		usage = math.Round(usage*100) / 100
	}

	return &BalanceSummary{
		CurrentBalance:  math.Abs(balance),
		BalanceType:     balanceType,
		CreditLimit:     limit,
		UsagePercentage: usage,
		NetBalance:      limit - balance,
	}, nil
}
