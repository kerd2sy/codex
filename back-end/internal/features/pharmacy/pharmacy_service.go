package pharmacy

import (
	"errors"
	"regexp"
	"tabarak-pharma-backend/internal/db"
	"tabarak-pharma-backend/internal/features/pharmacy/repositories"
	"tabarak-pharma-backend/internal/models"

	"gorm.io/gorm"
)

type PharmacyService struct {
	firebirdRepo *repositories.PharmacyRepository
}

func NewPharmacyService() *PharmacyService {
	return &PharmacyService{
		firebirdRepo: repositories.NewPharmacyRepository(),
	}
}

func (s *PharmacyService) LinkPharmacyToUser(user *models.User, req LinkPharmacyRequest) (*models.User, error) {
	// 1. Get Account from Firebird
	row, extraPhones, err := s.firebirdRepo.GetAccountDetails(req.Code)
	if err != nil {
		return nil, errors.New("كود الصيدلية غير صحيح أو تعذر الوصول لقاعدة البيانات")
	}

	// 2. Phone Validation Logic (Parity with Python)
	providedPhone := s.CleanPhone(req.Phone)
	if providedPhone == "" {
		return nil, errors.New("يرجى إدخال رقم الهاتف")
	}

	dbPhones := make([]string, 0)
	dbPhones = s.AppendPhone(dbPhones, row.Phone1)
	dbPhones = s.AppendPhone(dbPhones, row.Phone2)
	for _, p := range extraPhones {
		dbPhones = s.AppendPhone(dbPhones, p)
	}

	matched := false
	for _, p := range dbPhones {
		if providedPhone == p {
			matched = true
			break
		}
	}

	if !matched {
		return nil, errors.New("رقم الهاتف المدخل لا يتطابق مع أي رقم مسجل للصيدلية في النظام")
	}

	// 3. Ensure local record exists in Postgres
	var pharmacy models.Pharmacy
	if err := db.DB.Where("code = ?", req.Code).First(&pharmacy).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// NOTE: Manual conversion removed because charset=WIN1256 was added to Firebird DSN
			pharmacy = models.Pharmacy{
				Code:    row.ID,
				Name:    row.Name,
				Phone:   providedPhone,
				Address: row.Address,
			}
			if err := db.DB.Create(&pharmacy).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	} else {
		// If record exists, update name/address in case they were corrupted before
		pharmacy.Name = row.Name
		pharmacy.Address = row.Address
		db.DB.Save(&pharmacy)
	}

	// 4. Link to user
	// Check if already linked
	alreadyLinked := false
	for _, p := range user.Pharmacies {
		if p.ID == pharmacy.ID {
			alreadyLinked = true
			break
		}
	}

	if !alreadyLinked {
		if err := db.DB.Model(user).Association("Pharmacies").Append(&pharmacy); err != nil {
			return nil, err
		}
		// Refresh user to include new pharmacy
		db.DB.Preload("Pharmacies").First(user, user.ID)
	}

	return user, nil
}

func (s *PharmacyService) CleanPhone(phone string) string {
	re := regexp.MustCompile(`\D`)
	return re.ReplaceAllString(phone, "")
}

func (s *PharmacyService) AppendPhone(phones []string, phone string) []string {
	clean := s.CleanPhone(phone)
	if clean != "" {
		return append(phones, clean)
	}
	return phones
}

func (s *PharmacyService) UpdateLocation(user *models.User, pharmacyID uint, locationURL string) error {
	var pharmacy models.Pharmacy
	if err := db.DB.First(&pharmacy, pharmacyID).Error; err != nil {
		return errors.New("الصيدلية غير موجودة")
	}

	// Verify linkage
	found := false
	for _, p := range user.Pharmacies {
		if p.ID == pharmacyID {
			found = true
			break
		}
	}
	if !found {
		return errors.New("الصيدلية غير مرتبطة بحسابك")
	}

	pharmacy.LocationURL = locationURL
	return db.DB.Save(&pharmacy).Error
}
