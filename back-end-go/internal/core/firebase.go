package core

import (
	"context"
	"log"
	"path/filepath"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

var FCMClient *messaging.Client

func InitFirebase() {
	serviceAccountPath := "serviceAccountKey.json"
	absPath, _ := filepath.Abs(serviceAccountPath)
	
	opt := option.WithCredentialsFile(absPath)
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		log.Fatalf("error initializing firebase app: %v", err)
	}

	client, err := app.Messaging(context.Background())
	if err != nil {
		log.Fatalf("error getting Messaging client: %v", err)
	}

	FCMClient = client
	log.Println("Firebase Admin SDK initialized successfully")
}
