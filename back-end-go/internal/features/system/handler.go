package system

import (
	"fmt"
	"net/http"
	"tabarak-pharma-backend/internal/core"
	"tabarak-pharma-backend/internal/db"

	"github.com/gin-gonic/gin"
)

func Dashboard(c *gin.Context) {
	stats := core.GetStats()
	
	pgStatus := "Connected"
	if db.DB == nil {
		pgStatus = "Disconnected"
	}
	
	fbStatus := "Connected"
	if db.FB == nil || db.FB.Ping() != nil {
		fbStatus = "Disconnected"
	}

	html := fmt.Sprintf(`
	<!DOCTYPE html>
	<html lang="ar" dir="rtl">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Tabarak Pharma - Go Backend Dashboard</title>
		<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
		<style>
			body { font-family: 'Tajawal', sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
			.container { max-width: 900px; margin: 0 auto; }
			.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
			.status-tag { padding: 5px 15px; border-radius: 20px; background: #10b981; color: white; font-weight: bold; }
			.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
			.card { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; }
			.card h3 { margin: 0 0 10px 0; font-size: 0.9rem; color: #94a3b8; }
			.card .value { font-size: 1.5rem; font-weight: bold; }
			.db-status { display: flex; align-items: center; gap: 10px; margin-top: 20px; }
			.dot { width: 12px; height: 12px; border-radius: 50%%; }
			.dot.online { background: #10b981; }
			.dot.offline { background: #ef4444; }
			.footer { margin-top: 40px; text-align: center; color: #475569; font-size: 0.8rem; }
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<h1>لوحة تحكم السيرفر (Go)</h1>
				<div class="status-tag">متصل الآن</div>
			</div>

			<div class="grid">
				<div class="card">
					<h3>وقت التشغيل (Uptime)</h3>
					<div class="value">%s</div>
				</div>
				<div class="card">
					<h3>استهلاك الذاكرة</h3>
					<div class="value">%d MB</div>
				</div>
				<div class="card">
					<h3>Go Routines</h3>
					<div class="value">%d</div>
				</div>
				<div class="card">
					<h3>إصدار اللغة</h3>
					<div class="value">%s</div>
				</div>
			</div>

			<h2 style="margin-top: 40px;">حالة قواعد البيانات</h2>
			<div class="card">
				<div class="db-status">
					<div class="dot %s"></div>
					<span>PostgreSQL (Supabase): <strong>%s</strong></span>
				</div>
				<div class="db-status">
					<div class="dot %s"></div>
					<span>Firebird (Local DB): <strong>%s</strong></span>
				</div>
			</div>

			<div class="footer">
				&copy; 2026 Tabarak Pharma - نظام متطور بلغة Go
			</div>
		</div>
	</body>
	</html>
	`, 
	stats.Uptime, stats.MemoryAlloc, stats.GoRoutines, stats.GoVersion,
	statusClass(pgStatus), pgStatus, statusClass(fbStatus), fbStatus)

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

func statusClass(status string) string {
	if status == "Connected" {
		return "online"
	}
	return "offline"
}
