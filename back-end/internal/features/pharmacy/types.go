package pharmacy

type LinkPharmacyRequest struct {
	Code  string `json:"code" binding:"required"`
	Phone string `json:"phone"`
}
