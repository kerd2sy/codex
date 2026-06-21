package db

import (
	"bytes"
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func init() {
	sql.Register("firebird_http", &HTTPDriver{})
}

// HTTPDriver implements driver.Driver.
type HTTPDriver struct{}

// Open returns a new connection to the database.
// The name parameter is the proxy URL (e.g., "https://dom.tabarak-pharma.com").
func (d *HTTPDriver) Open(name string) (driver.Conn, error) {
	return &HTTPConn{
		ProxyURL: name,
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

// HTTPConn implements driver.Conn, driver.QueryerContext, and driver.ExecerContext.
type HTTPConn struct {
	ProxyURL string
	Token    string
	Client   *http.Client
}

func (c *HTTPConn) Prepare(query string) (driver.Stmt, error) {
	return nil, fmt.Errorf("prepared statements are not supported in HTTP proxy mode")
}

func (c *HTTPConn) Close() error {
	return nil
}

func (c *HTTPConn) Begin() (driver.Tx, error) {
	return nil, fmt.Errorf("transactions are not supported in read-only HTTP proxy mode")
}

// NamedValue helper to map to interface{}
func mapNamedValues(args []driver.NamedValue) []interface{} {
	result := make([]interface{}, len(args))
	for i, arg := range args {
		result[i] = arg.Value
	}
	return result
}

// QueryResponse represents the expected response from the proxy API
type QueryResponse struct {
	Columns []string        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
	Error   string          `json:"error,omitempty"`
}

// QueryContext handles SELECT queries
func (c *HTTPConn) QueryContext(ctx context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	payload := map[string]interface{}{
		"query": query,
		"args":  mapNamedValues(args),
	}
	
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal query payload: %w", err)
	}

	reqUrl := fmt.Sprintf("%s/api/query", c.ProxyURL)
	req, err := http.NewRequestWithContext(ctx, "POST", reqUrl, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.Token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	}

	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("proxy returned status code %d: %s", resp.StatusCode, string(respBody))
	}

	var qResp QueryResponse
	if err := json.NewDecoder(resp.Body).Decode(&qResp); err != nil {
		return nil, fmt.Errorf("failed to decode proxy response: %w", err)
	}

	if qResp.Error != "" {
		return nil, fmt.Errorf("proxy database error: %s", qResp.Error)
	}

	return &HTTPRows{
		columns: qResp.Columns,
		rows:    qResp.Rows,
		index:   0,
	}, nil
}

// ExecResult implements driver.Result for write operations
type ExecResult struct {
	rowsAffected int64
	lastInsertId int64
}

func (r ExecResult) LastInsertId() (int64, error) {
	return r.lastInsertId, nil
}

func (r ExecResult) RowsAffected() (int64, error) {
	return r.rowsAffected, nil
}

// ExecContext handles UPDATE, INSERT, DELETE queries
func (c *HTTPConn) ExecContext(ctx context.Context, query string, args []driver.NamedValue) (driver.Result, error) {
	payload := map[string]interface{}{
		"query": query,
		"args":  mapNamedValues(args),
	}
	
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal exec payload: %w", err)
	}

	reqUrl := fmt.Sprintf("%s/api/exec", c.ProxyURL)
	req, err := http.NewRequestWithContext(ctx, "POST", reqUrl, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.Token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.Token))
	}

	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("proxy returned status code %d: %s", resp.StatusCode, string(respBody))
	}

	var execResp struct {
		RowsAffected int64  `json:"rowsAffected"`
		LastInsertID int64  `json:"lastInsertID"`
		Error        string `json:"error,omitempty"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&execResp); err != nil {
		return nil, fmt.Errorf("failed to decode proxy response: %w", err)
	}

	if execResp.Error != "" {
		return nil, fmt.Errorf("proxy database exec error: %s", execResp.Error)
	}

	return ExecResult{
		rowsAffected: execResp.RowsAffected,
		lastInsertId: execResp.LastInsertID,
	}, nil
}

// HTTPRows implements driver.Rows.
type HTTPRows struct {
	columns []string
	rows    [][]interface{}
	index   int
}

func (r *HTTPRows) Columns() []string {
	return r.columns
}

func (r *HTTPRows) Close() error {
	return nil
}

func (r *HTTPRows) Next(dest []driver.Value) error {
	if r.index >= len(r.rows) {
		return io.EOF
	}
	
	row := r.rows[r.index]
	if len(row) != len(r.columns) {
		return fmt.Errorf("column count mismatch: expected %d, got %d", len(r.columns), len(row))
	}

	for i, val := range row {
		if val == nil {
			dest[i] = nil
			continue
		}

		// JSON decodes numbers as float64 by default.
		// Standard driver values must be mapped correctly.
		switch v := val.(type) {
		case float64:
			// If it has no decimal part, we can preserve it as int64 if needed, 
			// but database/sql Scan is very resilient and can scan float64/string into ints/floats.
			dest[i] = v
		case string:
			dest[i] = v
		case bool:
			dest[i] = v
		default:
			dest[i] = fmt.Sprintf("%v", v)
		}
	}
	
	r.index++
	return nil
}
