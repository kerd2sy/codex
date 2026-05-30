package core

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	SecretKey              string
	Algorithm              string
	DBHost                 string
	DBName                 string
	DBUser                 string
	DBPass                 string
	DBPort                 string
	SMSApiKey              string
	SMSDeviceId            string
	BrevoApiKey            string
	BaseURL                string
	GoogleClientID         string
	GoogleClientSecret     string
	PostgresDatabaseURI    string
	FirebirdConnectionMode string
	FirebirdProxyURL       string
	FirebirdProxyToken     string
}

func LoadConfig() *Config {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Select active profile: 'local_dev' or 'cloudflare_tunnel' (default)
	profile := getEnv("FIREBIRD_PROFILE", "cloudflare_tunnel")
	var host, name, user, pass, port string

	if profile == "local_dev" {
		host = getEnv("DB_HOST_DEV", "192.168.100.6")
		name = getEnv("DB_NAME_DEV", `E:\ORGA_SOFT\DATA\ORGA.GDB`)
		user = getEnv("DB_USER_DEV", "SYSDBA")
		pass = getEnv("DB_PASS_DEV", "masterkey")
		port = getEnv("DB_PORT_DEV", "3050")
	} else {
		host = getEnv("DB_HOST_PROD", "127.0.0.1")
		name = getEnv("DB_NAME_PROD", `D:\ORGA_SOFT\DATA\ORGA.GDB`)
		user = getEnv("DB_USER_PROD", "SYSDBA")
		pass = getEnv("DB_PASS_PROD", "masterkey")
		port = getEnv("DB_PORT_PROD", "3055")
	}

	return &Config{
		SecretKey:              getEnv("SECRET_KEY", ""),
		Algorithm:              getEnv("ALGORITHM", "HS256"),
		DBHost:                 host,
		DBName:                 name,
		DBUser:                 user,
		DBPass:                 pass,
		DBPort:                 port,
		SMSApiKey:              getEnv("SMS_API_KEY", ""),
		SMSDeviceId:            getEnv("SMS_DEVICE_ID", ""),
		BrevoApiKey:            getEnv("BREVO_API_KEY", ""),
		BaseURL:                getEnv("BASE_URL", ""),
		GoogleClientID:         getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:     getEnv("GOOGLE_CLIENT_SECRET", ""),
		PostgresDatabaseURI:    getEnv("POSTGRES_DATABASE_URI", ""),
		FirebirdConnectionMode: "local", // Using local TCP socket for both local dev and tunnel bridge
		FirebirdProxyURL:       "https://dom.tabarak-pharma.com",
		FirebirdProxyToken:     "",
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
