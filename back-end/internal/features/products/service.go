package products

import (
	"tabarak-pharma-backend/internal/features/pharmacy/repositories"
	"tabarak-pharma-backend/internal/models"
)

type ProductService struct {
	repo         *ProductRepository
	pharmacyRepo *repositories.PharmacyRepository
}

func NewProductService() *ProductService {
	return &ProductService{
		repo:         NewProductRepository(),
		pharmacyRepo: repositories.NewPharmacyRepository(),
	}
}

func (s *ProductService) SearchProducts(search string, limit int, user *models.User) ([]map[string]interface{}, error) {
	// Get pharmacy info to determine user kind (tier)
	kind := 4 // Default
	codes := s.pharmacyRepo.GetCleanPharmaCodes(user)
	if len(codes) > 0 {
		details, err := s.pharmacyRepo.GetPharmacyAccountDetails(codes[0])
		if err == nil && details != nil {
			if k, ok := details["kind"].(int); ok {
				kind = k
			}
		}
	}

	return s.repo.SearchProducts(search, limit, kind)
}

func (s *ProductService) GetRecentProducts(limit int, user *models.User) ([]map[string]interface{}, error) {
	kind := 4 // Default
	codes := s.pharmacyRepo.GetCleanPharmaCodes(user)
	if len(codes) > 0 {
		details, err := s.pharmacyRepo.GetPharmacyAccountDetails(codes[0])
		if err == nil && details != nil {
			if k, ok := details["kind"].(int); ok {
				kind = k
			}
		}
	}

	return s.repo.GetRecent(limit, kind)
}

func (s *ProductService) GetHistory(userID uint, limit int) ([]models.ProductSearchHistory, error) {
	return s.repo.GetHistory(userID, limit)
}

func (s *ProductService) AddHistory(userID uint, query string) error {
	return s.repo.AddHistory(userID, query)
}

func (s *ProductService) ClearHistory(userID uint) error {
	return s.repo.ClearHistory(userID)
}
