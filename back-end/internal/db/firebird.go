package db

import (
	"database/sql"
	"fmt"
	"log"
	"tabarak-pharma-backend/internal/core"

	_ "github.com/nakagami/firebirdsql"
)

var FB *sql.DB

func InitFirebird(config *core.Config) {
	var err error

	if config.FirebirdConnectionMode == "proxy" {
		log.Printf("Initializing Firebird connection in PROXY mode pointing to %s", config.FirebirdProxyURL)
		
		FB, err = sql.Open("firebird_http", config.FirebirdProxyURL)
		if err != nil {
			log.Println("Error: Could not initialize Firebird HTTP proxy driver:", err)
			return
		}
		
		log.Printf("Firebird HTTP proxy connection driver loaded (URL: %s)", config.FirebirdProxyURL)
		return
	}

	log.Println("Initializing Firebird connection in LOCAL TCP mode")
	// Connection string format: user:password@host:port/database
	// Adding charset=WIN1256 to handle Arabic characters in Firebird
	dsn := fmt.Sprintf("%s:%s@%s:%s/%s?charset=WIN1256",
		config.DBUser,
		config.DBPass,
		config.DBHost,
		config.DBPort,
		config.DBName,
	)

	FB, err = sql.Open("firebirdsql", dsn)
	if err != nil {
		log.Println("Error: Could not initialize Firebird driver:", err)
		return
	}

	// Configure pool
	FB.SetMaxOpenConns(15)
	FB.SetMaxIdleConns(5)

	// Note: We don't log.Fatal here because Firebird might be unreachable in dev, 
	// but the rest of the app (Postgres) should still work.
	err = FB.Ping()
	if err != nil {
		log.Println("Warning: Firebird server is unreachable:", err)
	} else {
		log.Println("Firebird connection established and verified")
	}
}
