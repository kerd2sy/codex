//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"regexp"
)

func main() {
	re := regexp.MustCompile(`[^\p{L}\p{N}\s]`)
	res := re.ReplaceAllString("زيرتك (123)!", " ")
	fmt.Printf("Replaced: '%s'\n", res)
}

