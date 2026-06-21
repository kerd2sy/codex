//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"tabarak-pharma-backend/internal/db"
)

func NormalizeArabic(s string) string {
	s = strings.ReplaceAll(s, "أ", "ا")
	s = strings.ReplaceAll(s, "إ", "ا")
	s = strings.ReplaceAll(s, "آ", "ا")
	s = strings.ReplaceAll(s, "ة", "ه")
	s = strings.ReplaceAll(s, "ى", "ي")
	return strings.ToLower(strings.TrimSpace(s))
}

func main() {
	db.InitDB() // Make sure this connects
	
	search := "زيرتك"
	limit := 50

	whereClause := "WHERE 1=1"
	params := []interface{}{limit}

	if search != "" {
		searchClean := strings.TrimSpace(search)
		searchNorm := NormalizeArabic(searchClean)
		
		re := regexp.MustCompile(`[^\p{L}\p{N}\s]`)
		searchAlphaNum := re.ReplaceAllString(searchNorm, " ")
		
		keywords := strings.Fields(searchAlphaNum)
		var nameConds []string
		var fuzzyConds []string
		var exactParams []interface{}
		var fuzzyParams []interface{}
		for _, kw := range keywords {
			if len(kw) >= 2 {
				nameConds = append(nameConds, "P.PROD_NAME CONTAINING ?")
				exactParams = append(exactParams, kw)
				
				if len(kw) >= 3 {
					chars := strings.Split(kw, "")
					fuzzyPattern := "%" + strings.Join(chars, "%") + "%"
					fuzzyConds = append(fuzzyConds, "UPPER(P.PROD_NAME) LIKE ?")
					fuzzyParams = append(fuzzyParams, strings.ToUpper(fuzzyPattern))
				}
			}
		}

		nameMatch := "1=0"
		if len(nameConds) > 0 {
			exactMatch := "(" + strings.Join(nameConds, " AND ") + ")"
			fuzzyMatch := "1=0"
			
			params = append(params, exactParams...)
			if len(fuzzyConds) > 0 {
				fuzzyMatch = "(" + strings.Join(fuzzyConds, " AND ") + ")"
				params = append(params, fuzzyParams...)
			}
			nameMatch = "(" + exactMatch + " OR " + fuzzyMatch + ")"
		}

		otherConds := []string{
			"P.BARCODE = ?", "P.BARCODE_U = ?",
			"P.BARCODE CONTAINING ?", "P.BARCODE_U CONTAINING ?",
		}
		params = append(params, searchClean, searchClean, searchClean, searchClean)

		if matched, _ := regexp.MatchString(`^\d+$`, searchClean); matched {
			val, _ := strconv.Atoi(searchClean)
			otherConds = append(otherConds, "P.PROD_ID = ?", "P.BAR_CODE = ?")
			params = append(params, val, val)
		}

		whereClause += fmt.Sprintf(" AND (%s OR %s)", nameMatch, strings.Join(otherConds, " OR "))
		
		newLimit := limit * 3
		if newLimit < 50 {
			newLimit = 50
		}
		params[0] = newLimit
	}

	query := fmt.Sprintf(`
		SELECT FIRST ? P.PROD_ID, MAX(P.PROD_NAME), MAX(P.CONSUMER), SUM(SS.TOTAL_QTY_ALL)
		FROM PRODUCTS P LEFT JOIN STOCK_STOCK SS ON P.PROD_ID = SS.PROD_ID AND SS.STORE_ID = 1 %s
		GROUP BY P.PROD_ID ORDER BY 2 ASC
	`, whereClause)

	rows, err := db.FB.Query(query, params...)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		count++
	}
	fmt.Printf("Query OK. Rows: %d\n", count)
}

