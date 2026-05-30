package utils

import (
	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/transform"
	"io"
	"strings"
)

func Win1256ToUTF8(s string) string {
	if s == "" {
		return ""
	}
	sr := strings.NewReader(s)
	tr := transform.NewReader(sr, charmap.Windows1256.NewDecoder())
	buf, err := io.ReadAll(tr)
	if err != nil {
		return s // Fallback to original
	}
	return string(buf)
}
